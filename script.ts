import axios from "axios";

try {
    const response = await axios.get('https://apidatalake.tesouro.gov.br/ords/cdwhprd/sadipem/tt/res-cronograma-pagamentos', {
        params: {
            limit: 50,
            offset: 0
        }
    });

    if (response.status == 200) {
        console.log(response.data);
    }
} catch (error) {
    console.log("[ERRO] Erro: \n", error)
}