import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { RAGService } from './ragService'

export interface RetrieveContext {
  paperId?: number
}

const retrieveSchema = z.object({ query: z.string() })

export const createRetrieveTool = (context: RetrieveContext = {}): ReturnType<typeof tool> =>
  tool(
    async ({ query }) => {
      const retrievedDocs = await RAGService.search(query, 4, { paperId: context.paperId })
      const serialized = retrievedDocs
        .map((doc) => {
          const source = String(doc.metadata.source ?? 'unknown')
          const paperId = String(doc.metadata.paperId ?? 'unknown')
          const chunkIndex = String(doc.metadata.chunkIndex ?? 'unknown')
          const sectionTitle = String(doc.metadata.sectionTitle ?? 'Body')
          const sectionType = String(doc.metadata.sectionType ?? 'other')
          const pageStart = String(doc.metadata.pageStart ?? 'unknown')
          const pageEnd = String(doc.metadata.pageEnd ?? pageStart)

          return [
            `Source: ${source}`,
            `PaperId: ${paperId}`,
            `Section: ${sectionTitle} (${sectionType})`,
            `Pages: ${pageStart}-${pageEnd}`,
            `Chunk: ${chunkIndex}`,
            `Content: ${doc.pageContent}`
          ].join('\n')
        })
        .join('\n\n')
      return [serialized, retrievedDocs]
    },
    {
      name: 'retrieve',
      description:
        'Retrieve paper snippets related to a query. If current paper is provided, search is constrained to that paper.',
      schema: retrieveSchema,
      responseFormat: 'content_and_artifact'
    }
  )
