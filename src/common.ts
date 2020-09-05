export const responseToJson = async (response: Promise<Response>) => await (await response).json();
