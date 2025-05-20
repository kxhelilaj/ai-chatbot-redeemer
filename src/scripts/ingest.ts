import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { HNSWLib } from '@langchain/community/vectorstores/hnswlib';
import { OllamaEmbeddings } from '@langchain/ollama';
import * as fs from 'fs';
import * as path from 'path';

const PDFS_DIR = path.join(process.cwd(), 'pdfs');
const VECTORSTORE_DIR = path.join(process.cwd(), 'vectorstore');

async function ingestDocs() {
  if (!fs.existsSync(PDFS_DIR)) {
    console.error(`The directory ${PDFS_DIR} does not exist. Please create it and add your PDFs.`);
    return;
  }

  // Initialize embeddings model
  const embeddings = new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseUrl: "http://localhost:11434" // Ensure Ollama is running locally
  });

  // Process each PDF in the directory
  const files = fs.readdirSync(PDFS_DIR).filter(file => file.endsWith('.pdf'));
  const docs = [];

  for (const file of files) {
    const filePath = path.join(PDFS_DIR, file);
    console.log(`Processing ${file}...`);
    
    const loader = new PDFLoader(filePath);
    const document = await loader.load();
    docs.push(...document);
  }

  // Split documents into chunks
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200
  });
  
  const splitDocs = await textSplitter.splitDocuments(docs);
  console.log(`Split into ${splitDocs.length} chunks`);

  // Create and save the vector store
  console.log("Creating vector store...");
  const vectorStore = await HNSWLib.fromDocuments(splitDocs, embeddings);
  await vectorStore.save(VECTORSTORE_DIR);
  
  console.log(`Vector store saved to ${VECTORSTORE_DIR}`);
}

ingestDocs().catch(console.error);