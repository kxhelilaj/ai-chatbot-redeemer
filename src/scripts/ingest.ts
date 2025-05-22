// src/scripts/ingest.ts
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { OllamaEmbeddings } from '@langchain/ollama';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const PDFS_DIR = path.join(process.cwd(), 'pdfs');
const VECTORSTORE_DIR = path.join(process.cwd(), 'vectorstore');

async function ingestDocs() {
  if (!fs.existsSync(PDFS_DIR)) {
    console.error(`❌ Directory ${PDFS_DIR} does not exist. Add your PDFs.`);
    return;
  }

  const embeddings = new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseUrl: process.env.OLLAMA_URL ?? "http://127.0.0.1:11434",
  });

  const files = fs.readdirSync(PDFS_DIR).filter(file => file.endsWith('.pdf'));
  const allDocs = [];

  for (const file of files) {
    const loader = new PDFLoader(path.join(PDFS_DIR, file));
    const docs = await loader.load();
    allDocs.push(...docs);
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const splitDocs = await splitter.splitDocuments(allDocs);
  console.log(`📄 Split into ${splitDocs.length} chunks`);

  // ✅ Sanitize documents (no metadata issues)
  const cleanDocs = splitDocs.map(doc => ({
    pageContent: doc.pageContent,
    metadata: {}, // remove potentially problematic metadata
  }));

  // ✅ Test embeddings
  const testEmbedding = await embeddings.embedQuery(cleanDocs[0].pageContent);
  if (!Array.isArray(testEmbedding) || testEmbedding.some(v => typeof v !== "number" || isNaN(v))) {
    throw new Error("❌ Embedding returned invalid vector.");
  }

  console.log("📥 Creating Chroma vector store...");

  await Chroma.fromDocuments(cleanDocs, embeddings, {
    collectionName: 'pdf-docs',
    // path: VECTORSTORE_DIR,
    url: process.env.CHROMA_URL ?? "http://localhost:8000",
  });

  console.log(`✅ Vector store saved to: ${VECTORSTORE_DIR}`);
}

ingestDocs().catch(err => {
  console.error("💥 Ingestion failed:", err.message);
  process.exit(1);
});
