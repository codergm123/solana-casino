const isEmptyObj = (obj) => Object.keys(obj).length === 0 && obj.constructor === Object;
const deepCopy = (obj) => {
  let clone = JSON.parse(JSON.stringify(obj)) // copy only values

  for (const key in obj) {
    if (typeof obj[key] === 'function') {
      clone[key] = obj[key]
    }
  }

  return clone;
}

module.exports = {
  isEmptyObj,
  deepCopy
};
