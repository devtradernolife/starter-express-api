const express = require('express');
const axios = require('axios');
const uuid = require('uuid');

const app = express();
const MAX_THREADS = 30;


async function requests_get(url, referer_url=null, headers=null, params=null, max_retries=5) {
    headers = headers || {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36 Edge/16.16299'
    };
    
    if (referer_url) {
        headers.Referer = referer_url;
    }

    for (let retry = 0; retry < max_retries; retry++) {
        try {
            const response = await axios.get(url, {
                params: params,
                headers: headers
            });
            if (response.status === 200 || response.status === 404) {
                return response;
            }
        } catch (error) {
            console.log(error);
        }
    }

    console.log(`Failed to get response from ${url} after ${max_retries} retries.`);
    return null;
}

async function get_security_info_from_settrade(symbol, language='en') {
    const url = `https://www.settrade.com/api/set/stock/${symbol}/info`;
    const referer_url = `https://www.settrade.com/th/equities/quote/${symbol}/overview`;
    const params = {
        'lang': language
    };

    const headers = {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36 Edge/16.16299',
        'X-Channel': 'WEB_SETTRADE',
        'X-Client-Uuid': uuid.v4()
    };

    const response = await requests_get(url, referer_url, headers, params);
    return response;
}

async function get_current_listed_securities_from_settrade(security_type='S') {
    const url = 'https://www.settrade.com/api/set/stock/list';
    const referer_url = 'https://www.settrade.com/th/get-quote';
    const params = {
        'securityType': security_type
    };
    
    const headers = {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36 Edge/16.16299',
        'X-Channel': 'WEB_SETTRADE',
        'X-Client-Uuid': uuid.v4()
    };
    console.log('before');

    const response = await requests_get(url, referer_url, headers, params);
    console.log('after');
    return response;
}

async function get_current_listed_securities() {
    let output = [];
    const response = await get_current_listed_securities_from_settrade('S');
    //const status = response.status;

    console.log(response)
    // console.log('error: ', response.data)
    // console.log('status: ',status)

    // if (status === 200) {
    //     const json_data = response.data;
    //     output = json_data.securitySymbols.map(symbol => symbol.symbol);
    // }

    return output;
}

async function settrade_info_eod(symbols) {
    const symbol = symbols[0];
    let res = await axios.get(`https://www.settrade.com/api/set/stock/${symbol}/chart-quotation?period=1D&accumulated=false`, {
        headers: {
            'Referer': `https://www.settrade.com/th/equities/quote/${symbol}/historical-trading`
        }
    });

    if (res.status !== 200) {
        console.log(`Failed to get date for ${symbol}`);
        return;
    }

    let data = res.data;
    let quotations = data.quotations;

    if (!quotations) {
        console.log(`No quotations for ${symbol}`);
        return;
    }

    for (let symbol of symbols) {
        symbol = symbol.toUpperCase();
        console.log('Start to download')
        let res_data = await get_security_info_from_settrade(symbol);
        res_data = res_data.data;
        console.log('Done')
        console.log(res_data);
    }
}

app.get('/download', async (req, res) => {
    console.log('Start to download')
    var current_listed_securities = await get_current_listed_securities();
    console.log('list: ', current_listed_securities)

    var current_listed_securities = ['AEONTS'];
    await settrade_info_eod(current_listed_securities, res);
    console.log('Done after info ticker')
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Server is up and running on port ${process.env.PORT || 3000}.`);
});