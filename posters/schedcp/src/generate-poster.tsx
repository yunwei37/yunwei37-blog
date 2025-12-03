import React from 'react';
import ReactPDF from '@react-pdf/renderer';
import { SchedCPPoster } from './components/Poster';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputPath = path.join(__dirname, '..', 'output', 'schedcp-poster.pdf');

async function generatePoster() {
  console.log('Generating SchedCP poster...');
  console.log(`Output path: ${outputPath}`);

  try {
    // Ensure output directory exists
    const fs = await import('fs');
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    await ReactPDF.render(<SchedCPPoster />, outputPath);
    console.log(`✓ Poster generated successfully: ${outputPath}`);
  } catch (error) {
    console.error('Error generating poster:', error);
    process.exit(1);
  }
}

generatePoster();
