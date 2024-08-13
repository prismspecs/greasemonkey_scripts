// ==UserScript==
// @name         Discord Super Overlay Image Cycler
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Cycle through images from divs with classes starting with "imageContainer" and display them in an overlay on Discord. Scroll up in divs with classes starting with "scroller" every second. Maintain a global list of image URLs, avoid duplicates, and display images in reverse order. Log new images to the console.
// @author       Your Name
// @match        https://discord.com/channels/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const imageDuration = 100; // Duration for image cycling in milliseconds
    const scrollDuration = 500; // Duration for scrolling in milliseconds
    const scrollUpAmount = 2000; // Amount to scroll up each time

    let globalImages = new Set(); // Use a Set to maintain a unique list of image URLs

    // Create the button element
    var button = document.createElement('button');
    button.textContent = 'Start Cycling';
    button.style.position = 'fixed'; // Use 'fixed' to position relative to the viewport
    button.style.right = '10px'; // Position 10 pixels from the right
    button.style.bottom = '10px'; // Position 10 pixels from the bottom
    button.style.padding = '10px 20px'; // Add some padding to make it look better
    button.style.backgroundColor = '#007bff'; // Button background color
    button.style.color = '#fff'; // Button text color
    button.style.border = 'none'; // Remove default border
    button.style.cursor = 'pointer'; // Change cursor on hover
    button.style.zIndex = '10000'; // Make sure the button is on top of other elements
    button.style.borderRadius = '5px'; // Rounded corners for button

    // Append the button to the body
    document.body.appendChild(button);

    let cycling = false;
    let intervalId;
    let overlayImage;
    let scrollIntervalId;

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
        // Remove unwanted parameters
        urlObj.searchParams.delete('width');
        urlObj.searchParams.delete('height');
        urlObj.searchParams.delete('quality');
        urlObj.searchParams.delete('format');
        // Add format=jpeg
        urlObj.searchParams.set('format', 'jpeg');
        return urlObj.toString();
    }

    // Function to collect images from divs with classes starting with "imageContainer"
    function collectImages() {
        document.querySelectorAll('div[class^="imageContainer"]').forEach(container => {
            container.querySelectorAll('img').forEach(img => {
                let fullResUrl = cleanImageUrl(img.src);
                if (!globalImages.has(fullResUrl)) {
                    globalImages.add(fullResUrl); // Add image to the global set
                    console.log('New image added:', fullResUrl); // Log the new image URL
                }
            });
        });
    }

    // Function to cycle through images from the global list in reverse order
    let index = 0;
    function cycleImages() {
        const images = Array.from(globalImages).reverse(); // Convert set to array and reverse it
        if (images.length === 0) {
            superOverlay.innerHTML = '<p>No images found</p>';
            return;
        }
        overlayImage.src = images[index];
        index = (index + 1) % images.length;
    }

    // Function to scroll up in divs with classes starting with "scroller"
    function scrollUpInScrollerDivs() {
        document.querySelectorAll('div[class^="scroller"]').forEach(div => {
            div.scrollTop = (div.scrollTop - scrollUpAmount + div.scrollHeight) % div.scrollHeight; // Adjust scroll amount and wrap around
        });
    }

    // Function to start the image cycling and scrolling
    function startCycling() {
        collectImages(); // Collect images from the start
        if (globalImages.size === 0) {
            superOverlay.innerHTML = '<p>No images found</p>';
            return;
        }
        superOverlay.style.display = 'flex';
        intervalId = setInterval(cycleImages, imageDuration); 
        scrollIntervalId = setInterval(() => {
            scrollUpInScrollerDivs();
            collectImages(); // Collect new images after scrolling
        }, scrollDuration);
        cycling = true;
        button.textContent = 'Stop Cycling';
    }

    // Function to stop the image cycling and scrolling
    function stopCycling() {
        clearInterval(intervalId);
        clearInterval(scrollIntervalId);
        superOverlay.style.display = 'none';
        cycling = false;
        button.textContent = 'Start Cycling';
    }

    // Toggle the cycling on button click
    button.addEventListener('click', () => {
        if (cycling) {
            stopCycling();
        } else {
            startCycling();
        }
    });

    // Toggle the cycling on "K" key press
    document.addEventListener('keydown', (event) => {
        if (event.key === 'k' || event.key === 'K') {
            if (cycling) {
                stopCycling();
            } else {
                startCycling();
            }
        }
    });

    // Use MutationObserver to detect changes in the DOM and collect images
    const observer = new MutationObserver(() => {
        collectImages(); // Collect images when changes occur in the DOM
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
