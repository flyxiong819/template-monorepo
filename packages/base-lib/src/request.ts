import type { Ref } from "vue";

/**
 * POST method
 * @param url 
 * @param params key=value, body info 
 * @param config key=value, eg: headers info
 * @returns Promise<{
 *  retcode: 0,
 *  retmsg: 'ok',
 *  data: 业务内容
 * }>
 * 若发生错误，则throw如下错误
 * throw {
 *  retcode?: 非0,
 *  retmsg: 错误信息
 * }
 */
export async function post(url: string, params: object = {}, config: object = {}) {
  const p = _post(url, params, config);
  return request(p);
}

/**
 * get method
 * @param url 
 * @param config key=value, 例如: headers info
 * @returns Promise<{
 *  retcode: 0,
 *  retmsg: 'ok',
 *  data: 业务内容
 * }>
 * 若发生错误，则throw如下错误
 * throw {
 *  retcode?: 非0,
 *  retmsg: 错误信息
 * }
 */
export async function get(url: string, config: object = {}) {
  const p = _get(url, config);
  return request(p);
}


let controller: any = null;
/** 
 * 主动取消responseChunked-url的上一次请求
 */
export function abortLastReq(url: string) {
  // 取消上一个请求，如果有的话
  if (controller[url]) {
    controller[url].abort();
  }
}
/**
 * （流式传输）分块传输
 * 含义：Transfer-Encoding: chunked 表示响应体采用分块传输编码。服务器会将响应体分成多个块进行传输，每个块有自己的长度标识。
 * 作用：当服务器无法预先知道响应体的长度时，可以使用分块传输编码，这样可以在生成响应体的同时就开始传输数据，提高传输效率。
 * @param llmResult Ref响应式对象，用于在获得全部结果之前，将已获得的结果传出去
 * @param url LLM地址
 * @param [params={}] post参数
 * @param [isNeedAbortLastP=true] 是否需要主动abort掉上一个未完成的同一个url的请求，默认true 
 * @param [config={}] fetch的其他配置参数
 * @returns {string} 全部的返回结果
 * 若发生错误，则throw如下错误
 * throw {
 *  retmsg: 错误信息
 * }
 */
export async function responseChunked(llmResult: Ref<string>, url: string, params: object = {}, isNeedAbortLastP = true, config: object = {}) {
  try {
    if (isNeedAbortLastP) {
      abortLastReq(url);
    }
    controller[url] = new AbortController();

    const response = await _post(url, params, {
      ...config,
      signal: controller[url].signal,
    });
    if (!response.ok) {
      // throw new Error('网络响应异常');
      throw {retmsg: `${response.status}错误`};
    }
    const reader = response.body?.getReader();
    const decoder = new TextDecoder('utf-8');

    let allRes = '';

    async function readChunked() {
      if (!reader) {
        return;
      }
      const { done, value } = await reader.read();
      if (done) {
        return;
      }

      const chunkMsg = decoder.decode(value);
      // console.log('chunked message: ', chunkMsg);
      // 拼接信息片段
      allRes += chunkMsg;

      // 将已获得结果提前返回出去
      llmResult.value = allRes;

      // 读取下一块内容
      await readChunked();
    }
    // 循环读取片段
    await readChunked();

    // 返回最后的所有结果
    return allRes;
  } catch(error: any) {
    throw {
      retmsg: getErrorReason(error),
    };
  }
}

/**
 * 纯粹的加载json/xml/或其他配置文件
 * @returns 文件内容
 * 若发生错误，则throw如下错误
 * throw {
 *  retmsg: 错误信息
 * }
 */
export async function getConf(url: string, config: object = {}) {
  const p = _get(url, config);
  return request(p, false);
}


/**
 * POST method
 * @param url 
 * @param params key=value, body info 
 * @param config key=value, eg: headers info
 * @returns Promise
 */
function _post(url: string, params: object = {}, config: object = {}) {
  return fetch(url, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...config,
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * get method
 * @param url 
 * @param config key=value, eg: headers info
 * @returns Promise
 */
function _get(url:string, config: object = {}) {
  return fetch(url, {
    ...config,
    method: 'GET',
  });
}

/**
 * post和get请求后的统一逻辑
 */
async function request(p: Promise<any>, isCheckCode = true) {
  let response;
  try {
    response = await p;
  } catch(error: any) {
    throw {
      retmsg: getErrorReason(error),
    };
  }

  if (!response.ok) {
    // 状态码非200错误，统一throw
    throw {
      retmsg: `${response.status}错误`,
    };
  }

  // 状态码为200
  let result;
  try {
    result = await response.json();
  } catch(error: any) {
    throw {
      retmsg: error.message,
    };
  }

  if (isCheckCode) {
    // retcode不为0,统一throw
    if (result.retcode !== 0) {
      throw Object.assign({
        retmsg: `未知错误[${result.retcode}]`,
      }, result);
    }

    return result.data;
  }

  return result;
}

/** 
 * 解析错误原因的辅助函数
 */
function getErrorReason(error: Error) {
  // 错误类型判断（不同环境可能有差异）
  if (error.name === "TypeError") {
    switch (error.message) {
      case "Failed to fetch":
        return "网络连接失败（可能是服务器未启动或 URL 错误）";
      case "Failed to resolve host":
        return "DNS 解析失败（域名不存在或无法访问）";
      default:
        return `网络错误：${error.message}`;
    }
  } else if (error.message.startsWith("HTTP 错误")) {
    return error.message; // HTTP 状态码错误
  } else {
    return `未知错误：${error.message}`;
  }
}
