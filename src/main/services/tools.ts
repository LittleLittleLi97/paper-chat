import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { AIService } from "./aiService";

const retrieveSchema = z.object({ query: z.string() });

export const retrieveTool = tool(
  async ({ query }) => {
    const retrievedDocs = await AIService.vectorStore?.similaritySearch(query, 2) || [];
    const serialized = retrievedDocs
      .map(
        (doc) => `Source: ${doc.metadata.source}\nContent: ${doc.pageContent}`
      )
      .join("\n");
    return [serialized, retrievedDocs];
  },
  {
    name: "retrieve",
    description: "Retrieve information related to a query.",
    schema: retrieveSchema,
    responseFormat: "content_and_artifact",
  }
);