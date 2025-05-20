import { NextRequest, NextResponse } from 'next/server';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';

const TEMPLATE = `
You are a helpful assistant that answers questions based on the provided context.
If you don't know the answer, just say you don't know. DO NOT make up an answer.

Context: {context}

Question: {question}

Answer:`;

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();
    if (!question?.trim()) {
      return NextResponse.json({ error: "Missing question" }, { status: 400 });
    }

    const embeddings = new OllamaEmbeddings({
      model: "nomic-embed-text",
      baseUrl: "http://localhost:11434"
    });

    const vectorStore = await Chroma.fromExistingCollection(embeddings, {
      collectionName: "my-assistant",
      url: "http://localhost:8000"
    });

    const retriever = vectorStore.asRetriever({ k: 5 });

    const model = new ChatOllama({
      model: "mistral",
      baseUrl: "http://localhost:11434",
      temperature: 0.1
    });

    const prompt = PromptTemplate.fromTemplate(TEMPLATE);

    const chain = RunnableSequence.from([
      {
        context: retriever.pipe(docs => docs.map(doc => doc.pageContent).join('\n\n')),
        question: new RunnablePassthrough()
      },
      prompt,
      model,
      new StringOutputParser()
    ]);

    const response = await chain.invoke(question);
    return NextResponse.json({ answer: response });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Failed to answer question' }, { status: 500 });
  }
}
