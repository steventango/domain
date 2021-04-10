importScripts('https://unpkg.com/mathjs@9.3.0/lib/browser/math.js')

self.addEventListener('message', function (event) {
  const request = JSON.parse(event.data)
  let result = []
  let err = null

  try {
    const f = math.compile(request.f).evaluate();
    for (var i = 0; i < request.p; ) {
      var x = Math.random() * request.domain - request.domain/2;
      var y = Math.random() * request.range - request.range/2;
      var z = f(x,y);
      if (!isNaN(z)) {
        result.push([x,y])
        ++i;
      }
    }
  } catch (e) {
    err = e
  }

  const response = {
    result: result,
    err: err
  }

  self.postMessage(JSON.stringify(response))
}, false)
