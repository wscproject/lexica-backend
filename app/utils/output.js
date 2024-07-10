import Axios from 'axios';
import Config from '../configs/env.config';

export async function responseSuccess(res, data) {
  return res.json({ status: 'Success', statusCode: 200, data });
}
export async function responseError(res, error) {
  console.log('error--', error); // => FOR DEBUGGING PURPOSE

  let message = 'Unexpected Error';
  let statusCode = 400;
  let errorCode = 40404;
  let payload;
  if (error) {
    if (typeof error === 'object') {
      message = error.MESSAGE;
      errorCode = error.CODE;

      if (error.CODE === 44001) {
        statusCode = 401;
      } else if (error.CODE === 44004) {
        statusCode = 401;
      } else if (error.CODE === 44002) {
        statusCode = 402;
      }

      if (error.message) {
        ({ message } = error);

        if (message.includes('pg_hba')) {
          message = 'Could not connect to database.';
        }

        errorCode = 88888;
      } else if (error[0]) {
        message = error;
        errorCode = 89898;
      } else if (error.PAYLOAD) {
        payload = error.PAYLOAD;
      }
    } else {
      ({ message } = error);
      errorCode = 40405;
    }
  }
  return res.status(statusCode).send({
    status: 'Error',
    statusCode,
    errorCode,
    message,
    payload,
  });
}
