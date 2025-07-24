type PError = {
  data?: string;
  retcode?: string;
  retmsg?: string;
}

/**
 * 将异步方法改为同步写法
 */
export async function to<P extends Promise<any> = Promise<any>>(promise: P) {
  try {
    const data = await promise;
    // return [null, data] as [null, P extends Promise<infer R> ? R : any];
    return [null, data] as [null, Awaited<P>];
  } catch (error) {
    return [error as PError, null] as [PError, null];
  }
}
