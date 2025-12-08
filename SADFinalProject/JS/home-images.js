    // home-image-loader.js
    import { supabase } from './db_connection.js';

    class HomeImageLoader {
        constructor() {
            this.init();
        }
        
        async init() {
            console.log("Loading images from database...");
            await this.loadDatabaseImages();
        }
        
        async loadDatabaseImages() {
            try {
                const { data, error } = await supabase
                    .from('home_image_assignments')
                    .select('*')
                    .order('page_section')
                    .order('position');
                
                if (error) throw error;
                
                if (!data || data.length === 0) {
                    console.log("No images in database, using hardcoded");
                    return;
                }
                
                console.log(`Found ${data.length} image assignments`);
                
                // Update each image
                data.forEach(item => {
                    this.updateImage(item);
                });
                
            } catch (error) {
                console.error("Error loading images:", error);
            }
        }
        
       updateImage(assignment) {
    // Get Supabase URL with cache busting
    const imageUrl = this.getSupabaseUrl(assignment.image_name, true);
    if (!imageUrl) return;
    
    // Find which element to update
    let elements = [];
    
    switch(assignment.page_section) {
        case 'carousel':
            const carouselItem = document.querySelector(`#mainPageCarousel .carousel-item:nth-child(${assignment.position})`);
            if (carouselItem) {
                elements = [carouselItem.querySelector('img')];
            }
            break;
            
        case 'news':
            const newsCard = document.querySelector(`#upcoming-events .grid > div:nth-child(${assignment.position})`);
            if (newsCard) {
                elements = [newsCard.querySelector('img')];
            }
            break;
            
        case 'projects':
            const projectCard = document.querySelector(`#featured-projects .grid > div:nth-child(${assignment.position})`);
            if (projectCard) {
                elements = [projectCard.querySelector('img')];
            }
            break;
            
        case 'logo':
            elements = document.querySelectorAll('header img, footer img');
            break;
            
        case 'banner':
            this.updateBanner(imageUrl);
            return;
    }
    
    // Update elements with forced reload
    elements.forEach(element => {
        if (element) {
            // Force image reload
            const newImage = new Image();
            newImage.onload = () => {
                element.src = imageUrl;
                if (assignment.alt_text) {
                    element.alt = assignment.alt_text;
                }
                console.log(`Updated ${assignment.page_section}-${assignment.position} with ${assignment.image_name}`);
            };
            newImage.src = imageUrl;
        }
    });
}
        
       getSupabaseUrl(imageName, bustCache = true) {
    try {
        const { data } = supabase.storage
            .from('Uploads')
            .getPublicUrl(imageName);
        
        if (bustCache) {
            // Add cache-busting timestamp
            return `${data.publicUrl}?t=${Date.now()}`;
        }
        
        return data.publicUrl;
    } catch (error) {
        console.error(`Error getting URL for ${imageName}:`, error);
        return null;
    }
}
        
        updateBanner(imageUrl) {
            // Update CSS background image
            const styleTag = document.querySelector('style');
            if (styleTag) {
                const originalCSS = styleTag.textContent;
                const updatedCSS = originalCSS.replace(
                    /background-image:\s*url\(['"]?[^'")]+['"]?\)/,
                    `background-image: url('${imageUrl}')`
                );
                styleTag.textContent = updatedCSS;
            }
        }
    }

    // Load images for everyone
    document.addEventListener('DOMContentLoaded', () => {
        const loader = new HomeImageLoader();
    });