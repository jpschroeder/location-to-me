
const randKey = () => {
    const randChar = (byte) => {
        const characters = 'abcdefghijklmnopqrstuvwxyz';
        return characters.charAt(byte % characters.length);
    }
    const randStr = (bytes) => {
        let result = '';
        bytes.forEach(b => { result += randChar(b); })
        return result;
    }
    const randBytes = (length) => {
        let bytes = new Uint8Array(10);
        return window.crypto.getRandomValues(bytes);
    }
    
    let bytes = randBytes(10);
    let parts = [
        randStr(bytes.slice(0, 3)),
        randStr(bytes.slice(3, 7)),
        randStr(bytes.slice(7, 10)),
    ]
    return parts.join('-');
}

const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');
    const rawData = window.atob(base64);
    let outputArray = new Uint8Array(rawData.length);
    for (var i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

const uuidv4 = () => {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}
