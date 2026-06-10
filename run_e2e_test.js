import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const artifactDir = '/Users/giovaniramosferreira/.gemini/antigravity/brain/5232476e-2b10-4b6c-bb24-0b359998670e';
const dummyImgPath = './dummy.jpg';
const dummyAudioPath = './dummy.wav';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Create 1x1 dummy JPG file for upload testing
fs.writeFileSync(dummyImgPath, Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64'));

// Create small dummy WAV file for audio upload testing
fs.writeFileSync(dummyAudioPath, Buffer.from('UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA', 'base64'));

async function runTest() {
  console.log("Starting Puppeteer E2E navigation test...");
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set mobile device viewport for mobile-first styling
  await page.setViewport({ width: 395, height: 850 });
  
  try {
    // 1. Visit Landing Page
    console.log("Navigating to Landing Page...");
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await delay(1000); 
    await page.screenshot({ path: path.join(artifactDir, '1_landing.png') });
    console.log("Landing page screenshot saved.");
    
    // 2. Go to Creator Page
    console.log("Navigating to Creator Wizard...");
    await page.goto('http://localhost:5173/classico/criar', { waitUntil: 'networkidle2' });
    
    // Wait for Step 1 Names input
    console.log("Waiting for Step 1 input...");
    await page.waitForSelector('input[placeholder="Ex: Mariana & João"]', { timeout: 5000 });
    await page.screenshot({ path: path.join(artifactDir, '2_wizard_step1.png') });
    
    // Step 1: Fill Couple Names using React Setter Hack
    console.log("Filling Step 1 (Names)...");
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="Ex: Mariana & João"]');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, 'Julia & Renato');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await delay(500);
    await page.screenshot({ path: path.join(artifactDir, '3_wizard_names.png') });
    
    // Click Next
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find(b => b.textContent.includes('Avançar'));
      if (nextBtn) nextBtn.click();
    });

    // Step 2: Wait for Date input
    console.log("Waiting for Step 2 date input...");
    await page.waitForSelector('input[type="date"]', { timeout: 5000 });
    await page.screenshot({ path: path.join(artifactDir, '3.5_wizard_date_form.png') });
    
    // Fill Dates using React Setter Hack
    console.log("Filling Step 2 (Dates)...");
    await page.evaluate(() => {
      const dateInputs = Array.from(document.querySelectorAll('input[type="date"]'));
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      
      if (dateInputs.length >= 1) {
        setter.call(dateInputs[0], '2023-06-12');
        dateInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        dateInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      if (dateInputs.length >= 3) {
        setter.call(dateInputs[1], '1998-04-15');
        dateInputs[1].dispatchEvent(new Event('input', { bubbles: true }));
        dateInputs[1].dispatchEvent(new Event('change', { bubbles: true }));

        setter.call(dateInputs[2], '1999-10-05');
        dateInputs[2].dispatchEvent(new Event('input', { bubbles: true }));
        dateInputs[2].dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await delay(500);
    await page.screenshot({ path: path.join(artifactDir, '4_wizard_date.png') });
    
    // First click to generate horoscope sinastry
    console.log("Triggering horoscope sinastry generation...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find(b => b.textContent.includes('Avançar'));
      if (nextBtn) nextBtn.click();
    });
    
    // Wait for the horoscope to compute
    await delay(2500);
    await page.screenshot({ path: path.join(artifactDir, '4.5_wizard_horoscope_generated.png') });
    
    // Second click to proceed to Step 3 (Dates Românticos na Região)
    console.log("Navigating to Step 3 (Cidade & Bairro)...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find(b => b.textContent.includes('Avançar'));
      if (nextBtn) nextBtn.click();
    });

    // Step 3: Wait for inputs
    console.log("Waiting for Step 3 inputs (Cidade & Bairro)...");
    await page.waitForSelector('input[placeholder="Ex: São Paulo"]', { timeout: 5000 });
    
    // Fill Cidade and Bairro
    await page.evaluate(() => {
      const cidadeInput = document.querySelector('input[placeholder="Ex: São Paulo"]');
      const bairroInput = document.querySelector('input[placeholder="Ex: Pinheiros"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      
      if (cidadeInput) {
        setter.call(cidadeInput, 'São Paulo');
        cidadeInput.dispatchEvent(new Event('input', { bubbles: true }));
        cidadeInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (bairroInput) {
        setter.call(bairroInput, 'Pinheiros');
        bairroInput.dispatchEvent(new Event('input', { bubbles: true }));
        bairroInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await delay(500);
    await page.screenshot({ path: path.join(artifactDir, '4.7_wizard_dates_form.png') });

    // First click to generate regional date suggestions
    console.log("Triggering regional date suggestions generation...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find(b => b.textContent.includes('Avançar'));
      if (nextBtn) nextBtn.click();
    });
    
    // Wait for the dates suggestions to compute
    await delay(2500);
    await page.screenshot({ path: path.join(artifactDir, '4.8_wizard_dates_suggested.png') });
    
    // Second click to proceed to Step 4
    console.log("Navigating to Step 4 (Message)...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find(b => b.textContent.includes('Avançar'));
      if (nextBtn) nextBtn.click();
    });

    // Step 4: Wait for Textarea
    console.log("Waiting for Step 4 textarea...");
    await page.waitForSelector('textarea', { timeout: 5000 });

    // Fill Message
    console.log("Filling Step 4 (Message)...");
    await page.evaluate(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setter.call(textarea, 'Nossos 3 anos juntos foram maravilhosos! Te amo cada dia mais e mais a cada segundo.');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await delay(500);
    await page.screenshot({ path: path.join(artifactDir, '5_wizard_message.png') });
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find(b => b.textContent.includes('Avançar'));
      if (nextBtn) nextBtn.click();
    });

    // Step 5: Wait for file input
    console.log("Waiting for Step 5 file input...");
    await page.waitForSelector('input[type="file"]', { timeout: 5000 });

    // Polaroid Photos (Upload dummy photo)
    console.log("Filling Step 5 (Polaroid Photos)...");
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(dummyImgPath);
    await delay(2000); // Wait for upload API to finish
    await page.screenshot({ path: path.join(artifactDir, '6_wizard_photos.png') });
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find(b => b.textContent.includes('Avançar'));
      if (nextBtn) nextBtn.click();
    });

    // Step 6: Wait for achievements list/input
    console.log("Waiting for Step 6 conquistas input...");
    await page.waitForSelector('input[placeholder^="Título:"]', { timeout: 5000 });

    // Fill Step 6 Conquistas
    console.log("Filling Step 6 (Conquistas)...");
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
      if (inputs.length >= 2) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        
        setter.call(inputs[0], 'Compramos nossa casinha 🏢');
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[0].dispatchEvent(new Event('change', { bubbles: true }));

        setter.call(inputs[1], 'Finalmente conquistamos o nosso apê!');
        inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    
    // Upload milestone photo
    const milestoneFileInput = await page.$('input[type="file"]');
    await milestoneFileInput.uploadFile(dummyImgPath);
    await delay(2000); 
    
    // Click Add
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(b => b.textContent.includes('Adicionar'));
      if (addBtn) addBtn.click();
    });
    await delay(1000);
    await page.screenshot({ path: path.join(artifactDir, '7_wizard_milestone.png') });
    
    // Click Next
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find(b => b.textContent.includes('Avançar'));
      if (nextBtn) nextBtn.click();
    });

    // Step 7: Wait for games inputs
    console.log("Waiting for Step 7 word game inputs...");
    await page.waitForSelector('input[placeholder="Palavra: Ex: TEAMO"]', { timeout: 5000 });

    // Fill Step 7
    console.log("Filling Step 7 (Word game & Roulette)...");
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
      if (inputs.length >= 2) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

        setter.call(inputs[0], 'FELICIDADE');
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[0].dispatchEvent(new Event('change', { bubbles: true }));

        setter.call(inputs[1], 'O que sinto ao seu lado');
        inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await delay(200);
    await page.screenshot({ path: path.join(artifactDir, '8_wizard_games.png') });
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find(b => b.textContent.includes('Avançar'));
      if (nextBtn) nextBtn.click();
    });

    // Step 8: Wait for search song input
    console.log("Waiting for Step 8 search song input...");
    await page.waitForSelector('input[placeholder="Ex: Perfect - Ed Sheeran"]', { timeout: 5000 });

    // Fill Step 8 (Music)
    console.log("Filling Step 8 (Music)...");
    await page.evaluate(() => {
      const searchInput = document.querySelector('input[placeholder="Ex: Perfect - Ed Sheeran"]');
      if (searchInput) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(searchInput, 'Ed Sheeran');
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    
    // Click search button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const searchBtn = buttons.find(b => b.textContent.includes('Buscar'));
      if (searchBtn) searchBtn.click();
    });
    await delay(3000); // Wait for iTunes search response
    await page.screenshot({ path: path.join(artifactDir, '9_wizard_music_results.png') });

    // Select the first song
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const selectBtn = buttons.find(b => b.textContent.includes('Selecionar'));
      if (selectBtn) selectBtn.click();
    });
    await delay(800);
    await page.screenshot({ path: path.join(artifactDir, '10_wizard_music_selected.png') });

    // Click Avançar to proceed to Step 9
    console.log("Navigating to Step 9 (Audio & Cupid)...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find(b => b.textContent.includes('Avançar'));
      if (nextBtn) nextBtn.click();
    });
    await delay(1000);
    await page.screenshot({ path: path.join(artifactDir, '10.5_wizard_audio_form.png') });

    // Step 9: Upload dummy audio file
    console.log("Uploading dummy audio file...");
    const audioFileInput = await page.$('input[type="file"][accept="audio/*"]');
    await audioFileInput.uploadFile(dummyAudioPath);
    
    // Wait for upload and simulated Cupid AI Commentary (1.8s) to complete
    await delay(3500);
    await page.screenshot({ path: path.join(artifactDir, '10.7_wizard_audio_uploaded.png') });

    // Submit form!
    console.log("Submitting form E2E...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const submitBtn = buttons.find(b => b.textContent.includes('Criar Página'));
      if (submitBtn) submitBtn.click();
    });

    
    // Wait for E2E redirect to CouplePage
    await delay(5000);
    console.log("Navigated URL after submit:", page.url());
    
    await page.screenshot({ path: path.join(artifactDir, '11_couple_page_loaded.png') });
    console.log("Couple Page screenshot saved.");
    
  } catch (err) {
    console.error("Test failed with error:", err);
    await page.screenshot({ path: path.join(artifactDir, 'error.png') });
  } finally {
    await browser.close();
    console.log("Test finished.");
  }
}

runTest();
