import axios from "axios";

const response = await axios.get('https://apiapex.tesouro.gov.br/aria/v1/series-temporais/custom/series', { params: { offset: 0, limit: 1, timeout: 60000 } });

console.log(JSON.stringify(response.data, null, 4));