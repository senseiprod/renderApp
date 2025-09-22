// server.js - Advanced Mockup Generator with Cloudinary for Shopify Integration

const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const cloudinary = require('cloudinary').v2; // Using Cloudinary for file storage
require('dotenv').config(); // To load credentials from .env file


console.log("Cloud Name from .env:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API Key from .env:", process.env.CLOUDINARY_API_KEY ? "Loaded" : "NOT LOADED");
console.log("API Secret from .env:", process.env.CLOUDINARY_API_SECRET ? "Loaded" : "NOT LOADED");

// --- CLOUDINARY CONFIGURATION ---
// This configures the Cloudinary SDK with your secret credentials
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- CLOUDINARY UPLOAD HELPER ---
// This function takes a file buffer and uploads it to Cloudinary.
// It returns a promise that resolves with the secure URL of the uploaded file.
const uploadToCloudinary = (buffer, filename) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "tote-bag-designs", // Organizes uploads into a folder in Cloudinary
                public_id: `${Date.now()}-${path.parse(filename).name}` // Creates a unique filename
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }
                resolve(result.secure_url);
            }
        );
        uploadStream.end(buffer);
    });
};


const app = express();
app.use(express.static('public'));
app.use(express.json({ limit: '50mb' }));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Cache for processed textures
const textureCache = new Map();

// --- UNTOUCHED ADVANCED IMAGE GENERATION FUNCTIONS ---

async function generateFabricTexture(width, height, color, textureType = 'canvas') {
    const cacheKey = `${width}x${height}-${color}-${textureType}`;
    if (textureCache.has(cacheKey)) {
        return textureCache.get(cacheKey);
    }

    let textureBuffer;
    
    if (textureType === 'canvas') {
        const weavePattern = await sharp({ create: { width: 20, height: 20, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite([{ input: Buffer.from(`<svg width="20" height="20" viewBox="0 0 20 20"><defs><pattern id="weave" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="rgba(255,255,255,0.1)"/><rect x="2" y="2" width="2" height="2" fill="rgba(0,0,0,0.05)"/></pattern></defs><rect width="20" height="20" fill="url(#weave)"/></svg>`), blend: 'multiply' }]).png().toBuffer();
        textureBuffer = await sharp({ create: { width, height, channels: 4, background: color } }).composite([{ input: weavePattern, tile: true, blend: 'multiply' }]).png().toBuffer();
    } else if (textureType === 'cotton') {
        const noiseSvg = `<svg width="100" height="100" viewBox="0 0 100 100"><defs><filter id="noise" x="0%" y="0%" width="100%" height="100%"><feTurbulence baseFrequency="0.9" numOctaves="4" result="noise"/><feColorMatrix type="saturate" values="0"/></filter></defs><rect width="100" height="100" fill="rgba(255,255,255,0.1)" filter="url(#noise)"/></svg>`;
        const noise = await sharp(Buffer.from(noiseSvg)).png().toBuffer();
        textureBuffer = await sharp({ create: { width, height, channels: 4, background: color } }).composite([{ input: noise, tile: true, blend: 'overlay' }]).png().toBuffer();
    }

    textureCache.set(cacheKey, textureBuffer);
    return textureBuffer;
}

async function generateDynamicLighting(width, height, logoX, logoY, logoWidth, logoHeight) {
    const lightSourceX = logoX + logoWidth / 2;
    const lightSourceY = logoY + logoHeight / 2;
    const lightingSvg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><radialGradient id="light" cx="${lightSourceX / width}" cy="${lightSourceY / height}" r="0.8"><stop offset="0%" stop-color="rgba(255,255,255,0.3)"/><stop offset="50%" stop-color="rgba(255,255,255,0.1)"/><stop offset="100%" stop-color="rgba(0,0,0,0.1)"/></radialGradient></defs><rect width="${width}" height="${height}" fill="url(#light)"/></svg>`;
    return await sharp(Buffer.from(lightingSvg)).resize(width, height).png().toBuffer();
}

async function applyFabricDistortion(logoBuffer, intensity = 0.1) {
    const metadata = await sharp(logoBuffer).metadata();
    const { width, height } = metadata;
    const distortionSvg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><filter id="fabricDistort" x="-50%" y="-50%" width="200%" height="200%"><feTurbulence baseFrequency="0.02" numOctaves="3" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="${intensity * 20}"/></filter></defs><rect width="${width}" height="${height}" fill="rgba(255,255,255,0.1)" filter="url(#fabricDistort)"/></svg>`;
    return await sharp(logoBuffer).modulate({ brightness: 1 + (intensity * 0.1), saturation: 1 + (intensity * 0.2) }).png().toBuffer();
}

async function generateEmbossedEffect(logoBuffer) {
    const embossed = await sharp(logoBuffer).convolve({ width: 3, height: 3, kernel: [-2, -1, 0, -1, 1, 1, 0, 1, 2] }).png().toBuffer();
    return await sharp(logoBuffer).composite([{ input: embossed, blend: 'overlay' }]).png().toBuffer();
}


// --- UNTOUCHED ORIGINAL /generate ENDPOINT ---
// This endpoint is for the original "download mockup" functionality.
app.post('/generate', upload.single('logoFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ details: 'No logo file was uploaded.' });
    }
    const color = req.body.color || '#FFFFFF';
    const logoBuffer = req.file.buffer;
    const logoX = parseFloat(req.body.logoX) || 0;
    const logoY = parseFloat(req.body.logoY) || 175;
    const logoWidth = parseInt(req.body.logoWidth) || 450;
    
    try {
        const config = { finalImageWidth: 2000, logoWidth: logoWidth, logoXOffset: logoX, logoYOffset: logoY };
        const backgroundAsset = 'assets/background.png';
        const bagBodyAsset = 'assets/bag-body-shape.png.png';
        const handlesAsset = 'assets/handles-shape.png.png';
        const shadowsAsset = 'assets/tote-shadows.png.png';
        const highlightsAsset = 'assets/tote-highlights.png.png';

        const baseMetadata = await sharp(backgroundAsset).metadata();
        const finalImageHeight = Math.round(baseMetadata.height * (config.finalImageWidth / baseMetadata.width));
        const cleanBackgroundBuffer = await sharp(backgroundAsset).resize(config.finalImageWidth, finalImageHeight).toBuffer();
        const solidColorCanvas = await sharp({ create: { width: config.finalImageWidth, height: finalImageHeight, channels: 4, background: color } }).png().toBuffer();
        const bagBodyMask = await sharp(bagBodyAsset).resize(config.finalImageWidth, finalImageHeight).toBuffer();
        const coloredBagBody = await sharp(solidColorCanvas).composite([{ input: bagBodyMask, blend: 'dest-in' }]).toBuffer();
        const handlesMask = await sharp(handlesAsset).resize(config.finalImageWidth, finalImageHeight).threshold().negate().toBuffer();
        const coloredHandles = await sharp(solidColorCanvas).composite([{ input: handlesMask, blend: 'dest-in' }]).toBuffer();
        const coloredFullBag = await sharp(coloredBagBody).composite([{ input: coloredHandles }]).toBuffer();
        const resizedLogo = await sharp(logoBuffer).resize({ width: config.logoWidth }).toBuffer();
        const logoMetadata = await sharp(resizedLogo).metadata();
        const logoTop = Math.round((finalImageHeight / 2) - (logoMetadata.height / 2) + config.logoYOffset);
        const logoLeft = Math.round((config.finalImageWidth / 2) - (logoMetadata.width / 2) + config.logoXOffset);

        const finalImageBuffer = await sharp(cleanBackgroundBuffer)
            .composite([
                { input: coloredFullBag },
                { input: resizedLogo, top: logoTop, left: logoLeft },
                { input: await sharp(shadowsAsset).resize(config.finalImageWidth, finalImageHeight).toBuffer(), blend: 'multiply' },
                { input: await sharp(highlightsAsset).resize(config.finalImageWidth, finalImageHeight).toBuffer(), blend: 'screen' },
            ])
            .toFormat('jpeg').jpeg({ quality: 95 }).toBuffer();

        res.setHeader('Content-Type', 'image/jpeg');
        res.send(finalImageBuffer);

    } catch (error) {
        console.error('Error generating mockup:', error);
        res.status(500).json({ details: 'An error occurred during image processing.' });
    }
});


// --- UNTOUCHED ORIGINAL /preview ENDPOINT ---
// This endpoint generates a fast, low-quality preview for the UI.
app.post('/preview', upload.single('logoFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ details: 'No logo file was uploaded.' });
    }
    const logoBuffer = req.file.buffer;
    const logoX = parseFloat(req.body.logoX) || 0;
    const logoY = parseFloat(req.body.logoY) || 175;
    const logoWidth = parseInt(req.body.logoWidth) || 450;
    
    try {
        const config = { finalImageWidth: 800, logoWidth: Math.round(logoWidth * 0.4), logoXOffset: Math.round(logoX * 0.4), logoYOffset: Math.round(logoY * 0.4) };
        const backgroundAsset = 'assets/background.png';
        const bagBodyAsset = 'assets/bag-body-shape.png.png';
        const handlesAsset = 'assets/handles-shape.png.png';
        const shadowsAsset = 'assets/tote-shadows.png.png';
        const highlightsAsset = 'assets/tote-highlights.png.png';
        
        const baseMetadata = await sharp(backgroundAsset).metadata();
        const finalImageHeight = Math.round(baseMetadata.height * (config.finalImageWidth / baseMetadata.width));
        const color = req.body.color || '#FFFFFF';
        const cleanBackgroundBuffer = await sharp(backgroundAsset).resize(config.finalImageWidth, finalImageHeight).toBuffer();
        const solidColorCanvas = await sharp({ create: { width: config.finalImageWidth, height: finalImageHeight, channels: 4, background: color } }).png().toBuffer();
        const bagBodyMask = await sharp(bagBodyAsset).resize(config.finalImageWidth, finalImageHeight).toBuffer();
        const coloredBagBody = await sharp(solidColorCanvas).composite([{ input: bagBodyMask, blend: 'dest-in' }]).toBuffer();
        const handlesMask = await sharp(handlesAsset).resize(config.finalImageWidth, finalImageHeight).threshold().negate().toBuffer();
        const coloredHandles = await sharp(solidColorCanvas).composite([{ input: handlesMask, blend: 'dest-in' }]).toBuffer();
        const coloredFullBag = await sharp(coloredBagBody).composite([{ input: coloredHandles }]).toBuffer();
        const resizedLogo = await sharp(logoBuffer).resize({ width: config.logoWidth }).toBuffer();
        const logoMetadata = await sharp(resizedLogo).metadata();
        const logoTop = Math.round((finalImageHeight / 2) - (logoMetadata.height / 2) + config.logoYOffset);
        const logoLeft = Math.round((config.finalImageWidth / 2) - (logoMetadata.width / 2) + config.logoXOffset);
        
        const previewBuffer = await sharp(cleanBackgroundBuffer)
            .composite([
                { input: coloredFullBag },
                { input: resizedLogo, top: logoTop, left: logoLeft },
                { input: await sharp(shadowsAsset).resize(config.finalImageWidth, finalImageHeight).toBuffer(), blend: 'multiply' },
                { input: await sharp(highlightsAsset).resize(config.finalImageWidth, finalImageHeight).toBuffer(), blend: 'screen' },
            ])
            .toFormat('jpeg').jpeg({ quality: 70 }).toBuffer();
        
        res.setHeader('Content-Type', 'image/jpeg');
        res.send(previewBuffer);
        
    } catch (error) {
        console.error('Error generating preview:', error);
        res.status(500).json({ details: 'An error occurred during preview generation.' });
    }
});


// --- NEW ENDPOINT FOR SHOPIFY INTEGRATION ---
// This endpoint generates the final mockup, uploads files to Cloudinary,
// and returns the URLs to the frontend so it can add them to the Shopify cart.
app.post('/finalize-for-shopify', upload.single('logoFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ details: 'No logo file was uploaded.' });
    }
    const color = req.body.color || '#FFFFFF';
    const logoBuffer = req.file.buffer;
    const logoX = parseFloat(req.body.logoX) || 0;
    const logoY = parseFloat(req.body.logoY) || 175;
    const logoWidth = parseInt(req.body.logoWidth) || 450;

    try {
        // Step 1: Generate the final high-quality mockup image.
        // This logic is copied directly from your original /generate endpoint to ensure high quality.
        const config = { finalImageWidth: 2000, logoWidth: logoWidth, logoXOffset: logoX, logoYOffset: logoY };
        const backgroundAsset = 'assets/background.png';
        const bagBodyAsset = 'assets/bag-body-shape.png.png';
        const handlesAsset = 'assets/handles-shape.png.png';
        const shadowsAsset = 'assets/tote-shadows.png.png';
        const highlightsAsset = 'assets/tote-highlights.png.png';

        const baseMetadata = await sharp(backgroundAsset).metadata();
        const finalImageHeight = Math.round(baseMetadata.height * (config.finalImageWidth / baseMetadata.width));
        const cleanBackgroundBuffer = await sharp(backgroundAsset).resize(config.finalImageWidth, finalImageHeight).toBuffer();
        const solidColorCanvas = await sharp({ create: { width: config.finalImageWidth, height: finalImageHeight, channels: 4, background: color } }).png().toBuffer();
        const bagBodyMask = await sharp(bagBodyAsset).resize(config.finalImageWidth, finalImageHeight).toBuffer();
        const coloredBagBody = await sharp(solidColorCanvas).composite([{ input: bagBodyMask, blend: 'dest-in' }]).toBuffer();
        const handlesMask = await sharp(handlesAsset).resize(config.finalImageWidth, finalImageHeight).threshold().negate().toBuffer();
        const coloredHandles = await sharp(solidColorCanvas).composite([{ input: handlesMask, blend: 'dest-in' }]).toBuffer();
        const coloredFullBag = await sharp(coloredBagBody).composite([{ input: coloredHandles }]).toBuffer();
        const resizedLogo = await sharp(logoBuffer).resize({ width: config.logoWidth }).toBuffer();
        const logoMetadata = await sharp(resizedLogo).metadata();
        const logoTop = Math.round((finalImageHeight / 2) - (logoMetadata.height / 2) + config.logoYOffset);
        const logoLeft = Math.round((config.finalImageWidth / 2) - (logoMetadata.width / 2) + config.logoXOffset);

        const finalImageBuffer = await sharp(cleanBackgroundBuffer)
            .composite([
                { input: coloredFullBag },
                { input: resizedLogo, top: logoTop, left: logoLeft },
                { input: await sharp(shadowsAsset).resize(config.finalImageWidth, finalImageHeight).toBuffer(), blend: 'multiply' },
                { input: await sharp(highlightsAsset).resize(config.finalImageWidth, finalImageHeight).toBuffer(), blend: 'screen' },
            ])
            .toFormat('jpeg').jpeg({ quality: 95 }).toBuffer();

        // Step 2: Upload both the final mockup and the original customer logo to Cloudinary.
        console.log("Uploading final mockup and original logo to Cloudinary...");
        const [mockupUrl, originalLogoUrl] = await Promise.all([
            uploadToCloudinary(finalImageBuffer, 'mockup.jpg'),
            uploadToCloudinary(req.file.buffer, req.file.originalname)
        ]);
        console.log("Uploads complete. Mockup URL:", mockupUrl);

        // Step 3: Send the URLs and config data back to the frontend.
        res.json({
            mockupUrl: mockupUrl,
            originalLogoUrl: originalLogoUrl,
            config: {
                color: color,
                logoX: logoX,
                logoY: logoY,
                logoWidth: logoWidth,
            }
        });

    } catch (error) {
        console.error('Error in /finalize-for-shopify endpoint:', error);
        res.status(500).json({ details: 'An error occurred while preparing your design for the cart.' });
    }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});