import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { OllamaEmbeddings } from '@langchain/ollama';
import * as fs from 'fs';
import * as path from 'path';

const PDFS_DIR = path.join(process.cwd(), 'pdfs');

async function ingestDocs() {
  if (!fs.existsSync(PDFS_DIR)) {
    console.error(`Missing directory: ${PDFS_DIR}`);
    return;
  }

  const embeddings = new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseUrl: "http://localhost:11434"
  });

  const docs = [];
  const files = fs.readdirSync(PDFS_DIR).filter(f => f.endsWith('.pdf'));

  for (const file of files) {
    const loader = new PDFLoader(path.join(PDFS_DIR, file));
    const doc = await loader.load();
    docs.push(...doc);
  }

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
  const chunks = await splitter.splitDocuments(docs);

  await Chroma.fromDocuments(chunks, embeddings, {
    collectionName: "my-assistant",
    url: "http://localhost:8000"
  });

  console.log("✅ Chroma vectorstore updated.");
}

ingestDocs().catch(console.error);
