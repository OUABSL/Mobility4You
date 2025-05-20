// No imports are needed for this function as it only uses built-in JavaScript features.
// Just export the function as you have done.

export function withTimeout(promise, ms = 10000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('La consulta está tardando demasiado. Inténtalo de nuevo más tarde.'));
        }, ms);
        promise
            .then((res) => {
                clearTimeout(timer);
                resolve(res);
            })
            .catch((err) => {
                clearTimeout(timer);
                reject(err);
            });
    });
}
