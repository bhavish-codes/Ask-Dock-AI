function keywordSearch(chunks,query){
  if(!query)return[];

  return chunks.filter(chunk=>
    chunk.toLowerCase().includes(query.toLowerCase())
  );
}

module.exports={keywordSearch};
