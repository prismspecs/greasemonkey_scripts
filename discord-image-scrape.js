// ==UserScript==
// @name         Discord Super Overlay Image Cycler
// @namespace    http://tampermonkey.net/
// @version      2.9
// @description  Collect images from divs with classes starting with "imageContainer" and display them in an overlay on Discord. Scroll up in divs with classes starting with "scroller" every second. Maintain a global list of image URLs, avoid duplicates, and display images in reverse order. Log new images to the console and download them as a JSON file when stopping collection. Options to ignore images in mosaicItem containers or if the container contains specific text.
// @author       Your Name
// @match        https://discord.com/channels/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const imageDuration = 50; // Duration for image cycling in milliseconds
    const scrollDuration = 200; // Duration for scrolling in milliseconds
    const scrollUpAmount = 4000; // Amount to scroll up each time
    const collectionFrequency = 500; // Frequency of image collection in milliseconds (more frequent)

    let globalImages = new Set(); // Use a Set to maintain a unique list of image URLs
    let collecting = false;
    let displaying = false;
    let ignoreImageGrids = true; // Default to ignoring images in containers with specific text
    let collectIntervalId;
    let displayIntervalId;
    let overlayImage;

    // Create the start/stop collection button
    var collectButton = document.createElement('button');
    collectButton.textContent = 'Start Collection';
    collectButton.style.position = 'fixed';
    collectButton.style.right = '10px';
    collectButton.style.bottom = '50px';
    collectButton.style.padding = '10px 20px';
    collectButton.style.backgroundColor = '#007bff';
    collectButton.style.color = '#fff';
    collectButton.style.border = 'none';
    collectButton.style.cursor = 'pointer';
    collectButton.style.zIndex = '10000';
    collectButton.style.borderRadius = '5px';

    // Create the start/stop display button
    var displayButton = document.createElement('button');
    displayButton.textContent = 'Start Display';
    displayButton.style.position = 'fixed';
    displayButton.style.right = '10px';
    displayButton.style.bottom = '10px';
    displayButton.style.padding = '10px 20px';
    displayButton.style.backgroundColor = '#007bff';
    displayButton.style.color = '#fff';
    displayButton.style.border = 'none';
    displayButton.style.cursor = 'pointer';
    displayButton.style.zIndex = '10000';
    displayButton.style.borderRadius = '5px';

    // Create a toggle button to enable/disable ignoring images with specific text
    var toggleIgnoreGridsButton = document.createElement('button');
    toggleIgnoreGridsButton.textContent = 'Ignore Image Grids: ON';
    toggleIgnoreGridsButton.style.position = 'fixed';
    toggleIgnoreGridsButton.style.right = '10px';
    toggleIgnoreGridsButton.style.bottom = '90px';
    toggleIgnoreGridsButton.style.padding = '10px 20px';
    toggleIgnoreGridsButton.style.backgroundColor = '#007bff';
    toggleIgnoreGridsButton.style.color = '#fff';
    toggleIgnoreGridsButton.style.border = 'none';
    toggleIgnoreGridsButton.style.cursor = 'pointer';
    toggleIgnoreGridsButton.style.zIndex = '10000';
    toggleIgnoreGridsButton.style.borderRadius = '5px';

    // Append the buttons to the body
    document.body.appendChild(collectButton);
    document.body.appendChild(displayButton);
    document.body.appendChild(toggleIgnoreGridsButton);

    // Create the superoverlay div
    const superOverlay = document.createElement('div');
    superOverlay.id = 'superoverlay';
    superOverlay.style.position = 'fixed';
    superOverlay.style.top = '0';
    superOverlay.style.left = '0';
    superOverlay.style.width = '100%';
    superOverlay.style.height = '100%';
    superOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    superOverlay.style.zIndex = '9999';
    superOverlay.style.display = 'none'; // Hidden initially
    superOverlay.style.alignItems = 'center';
    superOverlay.style.justifyContent = 'center';
    superOverlay.style.color = 'white'; // Color of the text in case no images are found
    document.body.appendChild(superOverlay);

    // Create an img element inside the superoverlay to display images
    overlayImage = document.createElement('img');
    overlayImage.style.maxWidth = '100%';
    overlayImage.style.maxHeight = '100%';
    superOverlay.appendChild(overlayImage);

    // Function to clean up image URLs by removing specific parameters and adding format=jpeg
    function cleanImageUrl(url) {
        const urlObj = new URL(url);
        urlObj.searchParams.delete('width');
        urlObj.searchParams.delete('height');
        urlObj.searchParams.delete('quality');
        urlObj.searchParams.delete('format');
        urlObj.searchParams.set('format', 'jpeg');
        return urlObj.toString();
    }

    // Function to collect images from divs with classes starting with "imageContainer"
function collectImages() {
    console.log('Collecting images...'); // Debug log
    document.querySelectorAll('div[class^="imageContainer"]').forEach(container => {
        // Traverse up to the parent LI element
        const parentLi = container.closest('li');
        if (parentLi) {
            // Check if the parent LI contains a DIV with "U1" text
            const containsText = Array.from(parentLi.querySelectorAll('div')).some(div => div.textContent.includes('U1'));

            // Proceed based on whether to ignore image grids or not
            if (!ignoreImageGrids || !containsText) {
                container.querySelectorAll('img').forEach(img => {
                    // Skip base64-encoded images
                    if (img.src.startsWith('data:image/')) {
                        return;
                    }

                    let fullResUrl = cleanImageUrl(img.src);
                    if (!globalImages.has(fullResUrl)) {
                        globalImages.add(fullResUrl); // Add image to the global set
                        console.log('New image added:', fullResUrl); // Log the new image URL
                    }
                });
            }
        }
    });
}


    // Function to start image collection
    function startCollecting() {
        collectImages(); // Initial collection
        collectIntervalId = setInterval(() => {
            scrollUpInScrollerDivs();
            collectImages(); // Collect new images after scrolling
        }, collectionFrequency); // Increased frequency
        collecting = true;
        collectButton.textContent = 'Stop Collection';
    }

    // Function to stop image collection and download JSON
    function stopCollecting() {
        clearInterval(collectIntervalId);
        collecting = false;
        collectButton.textContent = 'Start Collection';

        // Create and download JSON file
        const blob = new Blob([JSON.stringify(Array.from(globalImages), null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'image-urls.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Log the contents to the console
        for (const imageUrl of globalImages) {
            console.log(imageUrl);
        }
    }

    // Function to start image display
    let displayIndex = 0;
    function startDisplaying() {
        if (globalImages.size === 0) {
            superOverlay.innerHTML = '<p>No images found</p>';
            return;
        }
        superOverlay.style.display = 'flex';
        displayIntervalId = setInterval(() => {
            const images = Array.from(globalImages).reverse(); // Convert set to array and reverse it
            if (images.length > 0) {
                overlayImage.src = images[displayIndex];
                displayIndex = (displayIndex + 1) % images.length;
            }
        }, imageDuration);
        displaying = true;
        displayButton.textContent = 'Stop Display';
    }

    // Function to stop image display
    function stopDisplaying() {
        clearInterval(displayIntervalId);
        superOverlay.style.display = 'none';
        displaying = false;
        displayButton.textContent = 'Start Display';
    }

    // Function to scroll up in divs with classes starting with "scroller"
    function scrollUpInScrollerDivs() {
        console.log('Scrolling up in scroller divs...'); // Debug log
        document.querySelectorAll('div[class^="scroller"]').forEach(div => {
            div.scrollTop = (div.scrollTop - scrollUpAmount + div.scrollHeight) % div.scrollHeight; // Adjust scroll amount and wrap around
        });
      
      collectImages();
    }

    // Event listeners for the buttons
    collectButton.addEventListener('click', () => {
        if (collecting) {
            stopCollecting();
        } else {
            startCollecting();
        }
    });

    displayButton.addEventListener('click', () => {
        if (displaying) {
            stopDisplaying();
        } else {
            startDisplaying();
        }
    });

    // Toggle the ignoreImageGrids flag when the toggle button is clicked
    toggleIgnoreGridsButton.addEventListener('click', () => {
        ignoreImageGrids = !ignoreImageGrids;
        toggleIgnoreGridsButton.textContent = `Ignore Image Grids: ${ignoreImageGrids ? 'ON' : 'OFF'}`;
    });

    // Use MutationObserver to detect changes in the DOM and collect images
    const observer = new MutationObserver(() => {
        if (collecting) collectImages(); // Collect images when changes occur if collecting is active
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
