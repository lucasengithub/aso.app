import { parseStringPromise } from 'xml2js';

const URL_ASO_FEED = "https://asoaadm.substack.com/feed";
const URL_ESD_FEED = "https://admin-dev.esdmadrid.es/rss";

// Estructura para almacenar el caché de feeds RSS
interface RSSCache {
    asoFeed: string;
    asoFeedLimited: string; // Versión limitada para la página principal
    esdFeed: string;
    lastUpdated: number;
    asoItems: Array<{title: string, link: string, description: string, pubDate?: string}>;
    esdItems: Array<{title: string, link: string, pubDate?: string}>;
}

// Caché global
let rssCache: RSSCache = {
    asoFeed: "Cargando feed...",
    asoFeedLimited: "Cargando feed...",
    esdFeed: "Cargando feed ESD...",
    lastUpdated: 0,
    asoItems: [],
    esdItems: []
};

// Función para actualizar la caché
async function updateRSSCache(): Promise<void> {
    try {
        console.log(`[${new Date().toISOString()}] Actualizando caché de feeds RSS...`);
        
        // Actualizar el feed ASO (todos los posts)
        try {
            // Añadir parámetro para evitar caché del navegador
            const url = URL_ASO_FEED + `?cb=${Date.now()}`;
            const response = await fetch(url);
            const str = await response.text();
            const parsed = await parseStringPromise(str);
            let html = "";
            let limitedHtml = "";
            const items = parsed.rss.channel[0].item;
            
            // Crear array de items para comparar después
            const newAsoItems = items.map((item: any) => ({
                title: item.title[0],
                link: item.link[0],
                description: item.description[0],
                pubDate: item.pubDate ? item.pubDate[0] : new Date().toISOString()
            }));
            
            // Verificar si hay nuevos items comparando con la caché anterior
            if (rssCache.asoItems.length > 0) {
                const newItems = newAsoItems.filter((newItem: {title: string, link: string, description: string, pubDate?: string}) => 
                    !rssCache.asoItems.some(oldItem => oldItem.link === newItem.link)
                );
            }
            
            // Actualizar la caché con los nuevos items
            rssCache.asoItems = newAsoItems;
            
            // Procesar todos los items para la versión completa
            items.forEach((item: any) => {
                const title = item.title[0];
                const link = item.link[0];
                const description = item.description[0];
                html += `<div><a href="${link}" target="_blank" style="text-decoration: none;"><button class="bigPost"><h4>${title}</h4>\n<p>${description}</p></button></a></div>`;
            });
            
            // Procesar solo los primeros 3 items para la versión limitada
            const limitedItems = items.slice(0, 3);
            limitedItems.forEach((item: any) => {
                const title = item.title[0];
                const link = item.link[0];
                const description = item.description[0];
                limitedHtml += `<div><a href="${link}" target="_blank" style="text-decoration: none;"><button class="bigPost"><h4>${title}</h4>\n<p>${description}</p></button></a></div>`;
            });

            rssCache.asoFeed = html;
            rssCache.asoFeedLimited = limitedHtml;
            console.log(`[${new Date().toISOString()}] Feed ASO actualizado: ${items.length} entradas (3 para vista limitada)`);
        } catch (err) {
            console.error(`[${new Date().toISOString()}] Error al actualizar el caché del feed ASO:`, err);
        }
        
        // Actualizar el feed ESD (máximo 8 posts)
        try {
            const response = await fetch(URL_ESD_FEED);
            const str = await response.text();
            const parsed = await parseStringPromise(str);
            let html = "";
            const items = parsed.rss.channel[0].item;
            
            // Crear array de items para comparar después
            const newEsdItems = items.map((item: any) => ({
                title: item.title[0],
                link: item.link[0].replace('https://admin-dev.esdmadrid.es/', 'https://esdmadrid.es/posts/'),
                pubDate: item.pubDate ? item.pubDate[0] : new Date().toISOString()
            }));
            
            // Verificar si hay nuevos items comparando con la caché anterior
            if (rssCache.esdItems.length > 0) {
                const newItems = newEsdItems.filter((newItem: {title: string, link: string, pubDate?: string}) => 
                    !rssCache.esdItems.some(oldItem => oldItem.link === newItem.link)
                );
            }
            
            // Actualizar la caché con los nuevos items
            rssCache.esdItems = newEsdItems;
            
            // Limitar a 8 posts como máximo
            const limitedItems = items.slice(0, 8);
            limitedItems.forEach((item: any) => {
                const title = item.title[0];
                const badLink = item.link[0];
                const link = badLink.replace('https://admin-dev.esdmadrid.es/', 'https://esdmadrid.es/posts/');
                html += `<div><a href="${link}" target="_blank" style="text-decoration: none;"><button class="squarePost"></img>${title}</button></a></div>`;
            });
            
            // Añadir botón "Ver más" al final
            html += `<div><a href="https://esdmadrid.es/blog" target="_blank" style="text-decoration: none;"><button class="squarePost" style="color: #36e452; background-color: black; font-size: 1.4em">Ver más <span class="material-symbols-outlined">arrow_forward</span></button></a></div>`;
            
            rssCache.esdFeed = html;
            console.log(`[${new Date().toISOString()}] Feed ESD actualizado: ${limitedItems.length} de ${items.length} entradas (+ botón Ver más)`);
        } catch (err) {
            console.error(`[${new Date().toISOString()}] Error al actualizar el caché del feed ESD:`, err);
        }
        
        // Actualizar la marca de tiempo
        rssCache.lastUpdated = Date.now();
        console.log(`[${new Date().toISOString()}] Caché de feeds RSS actualizado correctamente`);
    } catch (err) {
        console.error(`[${new Date().toISOString()}] Error general al actualizar el caché de feeds RSS:`, err);
    }
}

// Función para obtener el feed ASO completo desde el caché
export async function getRSSFeedHTML(): Promise<string> {
    // Si el caché no se ha inicializado todavía, intentamos actualizarlo
    if (rssCache.lastUpdated === 0) {
        await updateRSSCache();
    }
    return rssCache.asoFeed;
}

// Función para obtener el feed ASO limitado (3 posts) desde el caché
export async function getLimitedRSSFeedHTML(): Promise<string> {
    // Si el caché no se ha inicializado todavía, intentamos actualizarlo
    if (rssCache.lastUpdated === 0) {
        await updateRSSCache();
    }
    return rssCache.asoFeedLimited;
}

// Función para obtener el feed ESD desde el caché (limitado a 8 posts)
export async function getESDRSSFeedHTML(): Promise<string> {
    // Si el caché no se ha inicializado todavía, intentamos actualizarlo
    if (rssCache.lastUpdated === 0) {
        await updateRSSCache();
    }
    return rssCache.esdFeed;
}

// Función para forzar una actualización manual del caché
export async function forceRSSCacheUpdate(): Promise<void> {
    await updateRSSCache();
    return;
}

// Inicializar el caché al cargar el módulo
console.log(`[${new Date().toISOString()}] Iniciando sistema de caché de feeds RSS`);
updateRSSCache();

// Configurar la actualización periódica del caché (cada 15 minutos)
const CACHE_INTERVAL = 15 * 60 * 1000; // 15 minutos en milisegundos
setInterval(updateRSSCache, CACHE_INTERVAL);
console.log(`[${new Date().toISOString()}] Sistema de actualización de caché configurado cada ${CACHE_INTERVAL/60000} minutos`);