// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { HNSWLib } from '@langchain/community/vectorstores/hnswlib';
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import * as path from 'path';

const VECTORSTORE_DIR = path.join(process.cwd(), 'vectorstore');

const TEMPLATE = `
You are a helpful assistant that STRICTLY answers questions based ONLY on the provided context.
If the context doesn't contain the information needed to answer the question, respond with "I don't have enough information to answer that question based on the provided documents."

Context:
{context}

Question: {question}

Answer based ONLY on the context above:`;

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();

    if (!question || typeof question !== 'string' || !question.trim()) {
      return NextResponse.json({ error: "Question is missing or invalid" }, { status: 400 });
    }

    console.log(`Received question: "${question}"`);
    console.log(`Attempting to load vector store from: ${VECTORSTORE_DIR}`);


    const embeddings = new OllamaEmbeddings({
      model: "nomic-embed-text",
      baseUrl: process.env.OLLAMA_URL,
    });

   
    const vectorStore = await HNSWLib.load(VECTORSTORE_DIR, embeddings);
  
    const retriever = vectorStore.asRetriever({
      k: 5,
    });

    const model = new ChatOllama({
      model: "mistral",
      baseUrl: process.env.OLLAMA_URL,
      temperature: 0.1,
    });

    const prompt = PromptTemplate.fromTemplate(TEMPLATE);

    const formatDocs = (docs: Array<{ pageContent: string, metadata: unknown }>): string => {
      if (!docs || docs.length === 0) {
        console.log("No documents retrieved or found meeting similarity criteria.");
        return "No relevant context found in the documents for this question.";
      }
      console.log(`Retrieved ${docs.length} documents for context.`);
      return docs.map(doc => doc.pageContent).join('\n\n---\n\n');
    };

    const chain = RunnableSequence.from([
      {
        context: retriever.pipe(formatDocs),
        question: new RunnablePassthrough(),
      },
      prompt,
      model,
      new StringOutputParser(),
    ]);

    console.log("Invoking RAG chain...");
    const answer = await chain.invoke(question as string);
    console.log("RAG chain finished. Sending response.");

    return NextResponse.json({ answer: answer.trim() });

  } catch (error: unknown) {
    console.error('Unhandled error in Chat API:', error);
    let errorMessage = "An unexpected error occurred while processing your question.";
    if (error instanceof Error) {
      errorMessage = error.message;
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed')) {
        return NextResponse.json({ error: 'Failed to connect to Ollama. Please ensure Ollama is running and accessible at the configured URL.' }, { status: 503 });
      }
    } else {
      errorMessage = String(error);
    }
    return NextResponse.json({ error: 'An unexpected error occurred.', details: errorMessage }, { status: 500 });
  }
}