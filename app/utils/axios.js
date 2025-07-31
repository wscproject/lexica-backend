/* eslint-disable no-unused-vars */
/* eslint-disable no-restricted-syntax */
import https from 'https';
import axios from 'axios';

const queryParser = (params) => {
  let queryParams = '';
  for (const key in params) {
    if (!queryParams) {
      queryParams = queryParams.concat(`?${key}=${encodeURIComponent(params[key])}`);
    } else {
      queryParams = queryParams.concat(`&${key}=${encodeURIComponent(params[key])}`);
    }
  }
  return queryParams;
};

const agent = new https.Agent({
  rejectUnauthorized: false,
});

export async function Get({
  url, params, headers, req, target, transaction, role,
}) {
  return new Promise((resolve, reject) => {
    axios.request({
      url: url + queryParser(params),
      method: 'GET',
      headers,
      httpsAgent: agent,
    })
      .then(async (response) => {
        resolve(response.data);
      })
      .catch(async (error) => {
        console.log('error', error);
        resolve({ error });
        // reject(error);
      });
  });
}
export async function Post({
  url, data, headers, req, target, transaction, role, requestPayload,
}) {
  return new Promise((resolve, reject) => {
    axios.request({
      url,
      method: 'POST',
      headers,
      data,
      // httpsAgent: agent,
    })
      .then(async (response) => {
        resolve(response.data);
      })
      .catch(async (error) => {
        resolve({ error });
        // resolve('done!');
        // reject(error);
      });
  });
}
export async function Put({
  url, params, data, headers, req, target, transaction, role, requestPayload,
}) {
  return new Promise((resolve, reject) => {
    axios.request({
      url: url + queryParser(params),
      method: 'PUT',
      headers,
      data,
    })
      .then(async (response) => {
        resolve(response.data);
      })
      .catch(async (error) => {
        console.log('error: ', error);
        resolve({ error });
      });
  });
}
export async function Delete({
  url, params, headers, req, target, transaction, role,
}) {
  return new Promise((resolve, reject) => {
    axios.request({
      url: url + queryParser(params),
      method: 'DELETE',
      headers,
    })
      .then(async (response) => {
        resolve(response);
      })
      .catch(async (error) => {
        reject(error);
      });
  });
}

export async function Patch({
  url, params, data, headers, req, target, transaction, role, requestPayload,
}) {
  return new Promise((resolve, reject) => {
    axios.request({
      url: url + queryParser(params),
      method: 'PATCH',
      headers,
      data,
    })
      .then(async (response) => {
        resolve(response.data);
      })
      .catch(async (error) => {
        console.log('error: ', error);
        resolve({ error });
      });
  });
}