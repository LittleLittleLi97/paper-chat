<template>
  <div class="paper-reader">
    <h3>{{ selectedPaper ? selectedPaper.title : '论文阅读器' }}</h3>
    <div class="content" ref="contentRef">
      <canvas ref="pdfCanvasRef"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker?worker';
import file from '../assets/test.pdf';
import { ref, onMounted } from 'vue';

pdfjsLib.GlobalWorkerOptions.workerPort = new pdfWorker();

interface Paper {
  id: number
  title: string
  content: string
}

interface Props {
  selectedPaper: Paper | null
}

defineProps<Props>()

const contentRef = ref<HTMLDivElement>();
const pdfCanvasRef = ref<HTMLCanvasElement>();

async function renderPage(
  pdfUrl: string,
  pageNum: number,
  canvas: HTMLCanvasElement
) {
  const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
  const page = await pdf.getPage(pageNum);

  const viewport = page.getViewport({ scale: 1.5 });
  const ctx = canvas.getContext('2d')!;

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: ctx,
    canvas,
    viewport
  }).promise;

  await renderTextLayer(page, viewport);
}

async function renderTextLayer(page, viewport) {
  const textContent = await page.getTextContent()

  const textLayerDiv = document.createElement('div')
  textLayerDiv.className = 'textLayer'

  contentRef.value!
    .querySelectorAll('.textLayer')
    .forEach(el => el.remove())

  contentRef.value!.appendChild(textLayerDiv)

  const textLayer = new pdfjsLib.TextLayer({
    textContentSource: textContent,
    container: textLayerDiv,
    viewport
  })

  await textLayer.render()
}

onMounted(()=>{
  if (pdfCanvasRef.value) {
    renderPage(file, 1, pdfCanvasRef.value);
  }
})
</script>

<style scoped>
.paper-reader {
  width: 100%;
  height: 100%;
  background-color: #1e1e1e;
  color: #cccccc;
  padding: 20px;
  box-sizing: border-box;
  overflow-y: auto;
}

h3 {
  margin: 0 0 20px 0;
  color: #cccccc;
  font-size: 16px;
  font-weight: 600;
}

.content {
  line-height: 1.6;
  font-size: 14px;
}

.textLayer {
  position: absolute;
  inset: 0;
  pointer-events: auto;
}
</style>