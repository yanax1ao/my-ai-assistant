import { ref } from 'vue';

export function useFileUpload() {
  const fileName = ref('');
  const chunks = ref<string[]>([]);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    fileName.value = file.name;
    let text = '';
    if (file.type === 'text/plain') {
      text = await file.text();
    } else if (file.type === 'application/pdf') {
      // PDF 支持暂略，仅提示
      alert('PDF 解析暂未实现，请上传 .txt 文件');
      return;
    } else {
      alert('仅支持 .txt 文件');
      return;
    }
    // 简单分块：按两个换行符分割
    chunks.value = text.split(/\n\s*\n/).filter((c) => c.trim().length > 0);
    alert(`成功加载 ${chunks.value.length} 个段落`);
  };

  const retrieveRelevantChunks = (query: string, topK = 3): string[] => {
    if (chunks.value.length === 0) return [];
    const keywords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 1);
    const scores = chunks.value.map((chunk) => {
      const lower = chunk.toLowerCase();
      return keywords.reduce((sum, kw) => sum + (lower.includes(kw) ? 1 : 0), 0);
    });
    const indexed = scores.map((score, idx) => ({ score, idx }));
    indexed.sort((a, b) => b.score - a.score);
    return indexed.slice(0, topK).map((i) => chunks.value[i.idx]);
  };

  const clearFile = () => {
    fileName.value = '';
    chunks.value = [];
  };

  return { fileName, chunks, handleFileUpload, retrieveRelevantChunks, clearFile };
}
