// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Chroma } from '@langchain/community/vectorstores/chroma';
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
    console.log(`Loading Chroma vector store from: ${VECTORSTORE_DIR}`);

    const embeddings = new OllamaEmbeddings({
      model: "nomic-embed-text",
      baseUrl: process.env.OLLAMA_URL,
    });

    const vectorStore = await Chroma.fromDocuments([], embeddings, {
      collectionName: 'pdf-docs',
      url: process.env.CHROMA_URL ?? "http://localhost:8000",
    });

    const retriever = vectorStore.asRetriever({ k: 5 });

    const model = new ChatOllama({
      model: "mistral",
      baseUrl: process.env.OLLAMA_URL,
      temperature: 0.1,
    });

    const prompt = PromptTemplate.fromTemplate(TEMPLATE);

    const formatDocs = (docs: Array<{ pageContent: string }>): string => {
      if (!docs || docs.length === 0) {
        return "No relevant context found in the documents for this question.";
      }
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
    const answer = await chain.invoke(question);
    console.log("RAG chain finished. Sending response.");

    return NextResponse.json({ answer: answer.trim() });

  } catch (error: unknown) {
    console.error('Unhandled error in Chat API:', error);
    let message = "Unexpected error occurred.";
    if (error instanceof Error) {
      message = error.message;
    }
    return NextResponse.json({ error: 'Unexpected error.', details: message }, { status: 500 });
  }
}
