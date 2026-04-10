import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { RAGService } from "./ragService";

export interface RetrieveContext {
  paperId?: number;
}

const retrieveSchema = z.object({ query: z.string() });

export const createRetrieveTool = (context: RetrieveContext = {}): ReturnType<typeof tool> =>
  tool(
    async ({ query }) => {
      const retrievedDocs = await RAGService.search(query, 4, { paperId: context.paperId });
      const serialized = retrievedDocs
        .map((doc) => {
          const source = String(doc.metadata.source ?? "unknown");
          const paperId = String(doc.metadata.paperId ?? "unknown");
          const chunkIndex = String(doc.metadata.chunkIndex ?? "unknown");
          return `Source: ${source}\nPaperId: ${paperId}\nChunk: ${chunkIndex}\nContent: ${doc.pageContent}`;
        })
        .join("\n\n");
      return [serialized, retrievedDocs];
    },
    {
      name: "retrieve",
      description:
        "Retrieve paper snippets related to a query. If current paper is provided, search is constrained to that paper.",
      schema: retrieveSchema,
      responseFormat: "content_and_artifact",
    }
  );
