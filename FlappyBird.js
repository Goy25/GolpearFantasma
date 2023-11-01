"use strict";

/* Variables globales */
var canvas;
var gl;
var programaID;
var background, bird;
var pipes = [];
var codigoBackground, codigoBird;
var codigoPipes = [];
var numeros;
var movY = -0.07, lastPos = -1, pipetx = 0, seguir = false, score = 0, ini = true;

/* Variables Uniformes */
var uMatrizProyeccion;
var uMatrizVista;
var uMatrizModelo;
var uUnidadDeTextura;
var uMatrizTextura;

/* Matrices */
var MatrizProyeccion = new Array(16);
var MatrizVista = new Array(16);
var MatrizModelo = new Array(16);
var MatrizTextura = new Array(16);

var despX_Textura = 0;
var incX = 1/3;

var animacion = false;

var tiempo_real;
var inicio = Date.now(); // Tiempo Inicial
var fin, duracion;
const PERIODO_MOVIMIENTO = 0.2; // 1/60 = 0.0167 (60 cuadros por seg.)
var tiempoMovimiento = PERIODO_MOVIMIENTO;

function compilaEnlazaLosShaders() {
  /* Se compila el shader de vertice */
  var shaderDeVertice = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(shaderDeVertice, document.getElementById("vs").text.trim());
  gl.compileShader(shaderDeVertice);
  if (!gl.getShaderParameter(shaderDeVertice, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shaderDeVertice));
  }

  /* Se compila el shader de fragmento */
  var shaderDeFragmento = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(shaderDeFragmento, document.getElementById("fs").text.trim());
  gl.compileShader(shaderDeFragmento);
  if (!gl.getShaderParameter(shaderDeFragmento, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shaderDeFragmento));
  }

  /* Se enlaza ambos shader */
  programaID = gl.createProgram();
  gl.attachShader(programaID, shaderDeVertice);
  gl.attachShader(programaID, shaderDeFragmento);
  gl.linkProgram(programaID);
  if (!gl.getProgramParameter(programaID, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(programaID));
  }

  /* Se instala el programa de shaders para utilizarlo */
  gl.useProgram(programaID);
}

function toRadians(grados) {
  return (grados * Math.PI) / 180;
}

function identidad(r) {
  r[0] = 1;
  r[4] = 0;
  r[8] = 0;
  r[12] = 0;
  r[1] = 0;
  r[5] = 1;
  r[9] = 0;
  r[13] = 0;
  r[2] = 0;
  r[6] = 0;
  r[10] = 1;
  r[14] = 0;
  r[3] = 0;
  r[7] = 0;
  r[11] = 0;
  r[15] = 1;
}

function traslacion(matriz, tx, ty, tz) {
  var r = new Array(16);
  r[0] = 1;
  r[4] = 0;
  r[8] = 0;
  r[12] = tx;
  r[1] = 0;
  r[5] = 1;
  r[9] = 0;
  r[13] = ty;
  r[2] = 0;
  r[6] = 0;
  r[10] = 1;
  r[14] = tz;
  r[3] = 0;
  r[7] = 0;
  r[11] = 0;
  r[15] = 1;
  multiplica(matriz, matriz, r);
}

function escalacion(matriz, sx, sy, sz) {
  var r = new Array(16);
  r[0] = sx;
  r[4] = 0;
  r[8] = 0;
  r[12] = 0;
  r[1] = 0;
  r[5] = sy;
  r[9] = 0;
  r[13] = 0;
  r[2] = 0;
  r[6] = 0;
  r[10] = sz;
  r[14] = 0;
  r[3] = 0;
  r[7] = 0;
  r[11] = 0;
  r[15] = 1;
  multiplica(matriz, matriz, r);
}

function rotacionX(matriz, theta) {
  let r = new Array(16);
  var c = Math.cos(toRadians(theta));
  var s = Math.sin(toRadians(theta));
  r[0] = 1;
  r[4] = 0;
  r[8] = 0;
  r[12] = 0;
  r[1] = 0;
  r[5] = c;
  r[9] = -s;
  r[13] = 0;
  r[2] = 0;
  r[6] = s;
  r[10] = c;
  r[14] = 0;
  r[3] = 0;
  r[7] = 0;
  r[11] = 0;
  r[15] = 1;
  multiplica(matriz, matriz, r);
}

function rotacionY(matriz, theta) {
  let r = new Array(16);
  var c = Math.cos(toRadians(theta));
  var s = Math.sin(toRadians(theta));
  r[0] = c;
  r[4] = 0;
  r[8] = s;
  r[12] = 0;
  r[1] = 0;
  r[5] = 1;
  r[9] = 0;
  r[13] = 0;
  r[2] = -s;
  r[6] = 0;
  r[10] = c;
  r[14] = 0;
  r[3] = 0;
  r[7] = 0;
  r[11] = 0;
  r[15] = 1;
  multiplica(matriz, matriz, r);
}

function rotacionZ(matriz, theta) {
  let r = new Array(16);
  var c = Math.cos(toRadians(theta));
  var s = Math.sin(toRadians(theta));
  r[0] = c;
  r[4] = -s;
  r[8] = 0;
  r[12] = 0;
  r[1] = s;
  r[5] = c;
  r[9] = 0;
  r[13] = 0;
  r[2] = 0;
  r[6] = 0;
  r[10] = 1;
  r[14] = 0;
  r[3] = 0;
  r[7] = 0;
  r[11] = 0;
  r[15] = 1;
  multiplica(matriz, matriz, r);
}

function ortho(r, izq, der, abj, arr, cerca, lejos) {
  r[0] = 2 / (der - izq);
  r[4] = 0;
  r[8] = 0;
  r[12] = -(der + izq) / (der - izq);
  r[1] = 0;
  r[5] = 2 / (arr - abj);
  r[9] = 0;
  r[13] = -(arr + abj) / (arr - abj);
  r[2] = 0;
  r[6] = 0;
  r[10] = -2 / (lejos - cerca);
  r[14] = -(lejos + cerca) / (lejos - cerca);
  r[3] = 0;
  r[7] = 0;
  r[11] = 0;
  r[15] = 1;
}

function frustum(r, izq, der, abj, arr, cerca, lejos) {
  r[0] = (2 * cerca) / (der - izq);
  r[4] = 0;
  r[8] = (der + izq) / (der - izq);
  r[12] = 0;
  r[1] = 0;
  r[5] = (2 * cerca) / (arr - abj);
  r[9] = (arr + abj) / (arr - abj);
  r[13] = 0;
  r[2] = 0;
  r[6] = 0;
  r[10] = -(lejos + cerca) / (lejos - cerca);
  r[14] = (-2 * lejos * cerca) / (lejos - cerca);
  r[3] = 0;
  r[7] = 0;
  r[11] = -1;
  r[15] = 0;
}

function perspective(r, fovy, aspecto, cerca, lejos) {
  var ang = fovy * 0.5;
  var f =
    (Math.abs(Math.sin(toRadians(ang))) < 1e-8 ? 0 : 1) /
    Math.tan(toRadians(ang));
  r[0] = f / aspecto;
  r[4] = 0;
  r[8] = 0;
  r[12] = 0;
  r[1] = 0;
  r[5] = f;
  r[9] = 0;
  r[13] = 0;
  r[2] = 0;
  r[6] = 0;
  r[10] = -(lejos + cerca) / (lejos - cerca);
  r[14] = (-2.0 * lejos * cerca) / (lejos - cerca);
  r[3] = 0;
  r[7] = 0;
  r[11] = -1.0;
  r[15] = 0;
}

function multiplica(c, a, b) {
  let r = new Array(16);
  let i, j, k;
  for (i = 0; i < 4; i++) {
    for (j = 0; j < 4; j++) {
      let s = 0;
      for (k = 0; k < 4; k++) s = s + a[i + k * 4] * b[k + j * 4];
      r[i + j * 4] = s;
    }
  }
  for (i = 0; i < 16; i++) c[i] = r[i];
}

class Rectangulo {
  constructor(gl, x1 = -5, y1 = -5, x2 = 5, y2 = 5, u1 = 0, v1 = 0, u2 = 1, v2 = 1, tx = 0, ty = 0) {
    this.tx = tx;
    this.ty = ty;
    var vertices = new Float32Array(8);
    vertices[0] = x1;
    vertices[1] = y1; // 0
    vertices[2] = x2;
    vertices[3] = y1; // 1
    vertices[4] = x2;
    vertices[5] = y2; // 2
    vertices[6] = x1;
    vertices[7] = y2; // 3

    var coord_textura = new Float32Array(8);
    coord_textura[0] = u1;
    coord_textura[1] = v1; // 0
    coord_textura[2] = u2;
    coord_textura[3] = v1; // 1
    coord_textura[4] = u2;
    coord_textura[5] = v2; // 2
    coord_textura[6] = u1;
    coord_textura[7] = v2; // 3

    this.rectanguloVAO = gl.createVertexArray();
    gl.bindVertexArray(this.rectanguloVAO);

    var codigoVertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, codigoVertices);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    var codigoCoordenadasDeTextura = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, codigoCoordenadasDeTextura);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(coord_textura),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  muestra(gl) {
    gl.bindVertexArray(this.rectanguloVAO);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    gl.bindVertexArray(null);
  }
}

class Pipe {
  constructor(gl, pos = 0, y1 = -5, y2 = 5, u1 = 0, v1 = 0, u2 = 1, v2 = 1) {
    this.pos = pos;
    this.x = 3.5 * (pos + 1);;
    this.y1 = y1;
    this.y2 = y2;
    var vertices = [this.x, y1, this.x+1, y1, this.x+1, y2, this.x, y2];

    var coord_textura = new Float32Array(8);
    coord_textura[0] = u1;
    coord_textura[1] = v1; // 0
    coord_textura[2] = u2;
    coord_textura[3] = v1; // 1
    coord_textura[4] = u2;
    coord_textura[5] = v2; // 2
    coord_textura[6] = u1;
    coord_textura[7] = v2; // 3

    this.rectanguloVAO = gl.createVertexArray();
    gl.bindVertexArray(this.rectanguloVAO);

    var codigoVertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, codigoVertices);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    var codigoCoordenadasDeTextura = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, codigoCoordenadasDeTextura);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(coord_textura),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  muestra(gl) {
    gl.bindVertexArray(this.rectanguloVAO);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    gl.bindVertexArray(null);
  }
}

function leeLaTextura(ID_del_archivo, codigoDeTextura) {
  gl.bindTexture(gl.TEXTURE_2D, codigoDeTextura);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  let imagen = document.getElementById(ID_del_archivo);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imagen);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
}

function comprobar (b, p) {
  if (p.x + pipetx > -2.55 || p.x + pipetx < -4) {
    return false;
  }
  
  if (b.ty - 0.24 > p.y2 && b.ty < p.y2 + 1.77) {
    return false;
  }
  return true;
}

function dibuja() {
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1i(uUnidadDeTextura, 0);

  identidad(MatrizTextura);
  // traslacion(MatrizTextura, despX_Textura, despY_Textura, 0);
  gl.uniformMatrix4fv(uMatrizTextura, false, MatrizTextura);

  identidad(MatrizModelo);
  gl.uniformMatrix4fv(uMatrizModelo, false, MatrizModelo);

  gl.bindTexture(gl.TEXTURE_2D, codigoBackground);
  background.muestra(gl);

  if (lastPos + 1 <= bird.ty) {
    movY = -0.07;
  }
  if (bird.ty > -4.75 || movY > 0) {
    bird.ty += movY;
  }
  if (bird.ty > 4.75) {
    movY = -0.07;
  }

  identidad(MatrizTextura);
  traslacion(MatrizTextura, despX_Textura, 0, 0);
  gl.uniformMatrix4fv(uMatrizTextura, false, MatrizTextura);

  identidad(MatrizModelo);
  traslacion(MatrizModelo, bird.tx, bird.ty, 0);
  gl.uniformMatrix4fv(uMatrizModelo, false, MatrizModelo);

  gl.bindTexture(gl.TEXTURE_2D, codigoBird);
  bird.muestra(gl);

  if (pipes[0].x + pipetx > -4.011 && pipes[0].x + pipetx < -3.989) {
    score += 1;
  }

  if (pipes[0].x + pipetx < -6) {
    for (let i = 0; i < 6; i+=2) {
      pipes[i] = pipes[i+2];
      pipes[i+1] = pipes[i+3];
      codigoPipes[i] = codigoPipes[i+2];
      codigoPipes[i+1] = codigoPipes[i+3];
    }

    const y = Math.random() * 4 - 3;
    const pos = pipes[7].pos + 1;

    pipes[6] = new Pipe(gl, pos, -5, y);
    codigoPipes[6] = gl.createTexture();
    leeLaTextura("Pipe", codigoPipes[6]);

    pipes[7] = new Pipe(gl, pos, 5, y + 2);
    codigoPipes[7] = gl.createTexture();
    leeLaTextura("Pipe", codigoPipes[7]);
  }

  identidad(MatrizTextura);
  gl.uniformMatrix4fv(uMatrizTextura, false, MatrizTextura);

  identidad(MatrizModelo);
  traslacion(MatrizModelo, pipetx, 0, 0);
  pipetx -= 0.03;
  gl.uniformMatrix4fv(uMatrizModelo, false, MatrizModelo);

  for (let i = 0; i < pipes.length; i++) {
    gl.bindTexture(gl.TEXTURE_2D, codigoPipes[i]);
    pipes[i].muestra(gl);
    if (i % 2 == 0) {
      if (comprobar(bird, pipes[i])) seguir = false;
    }
  }

  let n = score.toString();
  for (let i=0; i<n.length; i++) {
    identidad(MatrizModelo);
    traslacion(MatrizModelo, 0.5 * i, 0, 0);
    gl.uniformMatrix4fv(uMatrizModelo, false, MatrizModelo);
    gl.bindTexture(gl.TEXTURE_2D, numeros[n[i]].cod);
    numeros[i].num.muestra(gl);
  }
  /* Se efectua loa incrementos para la animación */
  fin = Date.now(); // Tiempo Final
  duracion = fin - inicio;
  inicio = fin;
  tiempo_real = duracion / 1000.0;
  tiempoMovimiento = tiempoMovimiento - tiempo_real;

  if (tiempoMovimiento < 0.001) {
    tiempoMovimiento = PERIODO_MOVIMIENTO;

    despX_Textura = despX_Textura + incX; // en u (o s)
    if (despX_Textura > 0.5 || despX_Textura < 0.1) {
      incX = -incX;;
    }
  }
  if (seguir) {
    requestAnimationFrame(dibuja)
  }
  else {
    identidad(MatrizModelo);
    gl.uniformMatrix4fv(uMatrizModelo, false, MatrizModelo);
    if (ini) {
      const figura = new Rectangulo(gl, -2, -3, 2, 3);
      const codigoFigura = gl.createTexture();
      leeLaTextura("Inicio", codigoFigura);
      gl.bindTexture(gl.TEXTURE_2D, codigoFigura);
      figura.muestra(gl);
    }
    else {
      const figura = new Rectangulo(gl, -2, -1, 2, 1);
      const codigoFigura = gl.createTexture();
      leeLaTextura("Gameover", codigoFigura);
      gl.bindTexture(gl.TEXTURE_2D, codigoFigura);
      figura.muestra(gl);
    }
    ini = false;
  }
}

document.addEventListener("keydown", function (event) {
  if (event.keyCode == 32 && seguir) {
    movY = 0.07;
    lastPos = bird.ty;
  }
  else if (event.keyCode == 13 && !seguir) {
    seguir = true;
    bird = new Rectangulo(gl, -0.25, -0.25, 0.25, 0.25, 0, 0, 1/3, 1, -2.75);
    pipes = [];
    codigoPipes = [];
    for (let i = 0; i < 4; i++) {
      const y = Math.random() * 4 - 3;
      pipes.push(new Pipe(gl, i, -5, y));
      codigoPipes.push(gl.createTexture());
      leeLaTextura("Pipe", codigoPipes[pipes.length - 1]);
  
      pipes.push(new Pipe(gl, i, 5, y + 2));
      codigoPipes.push(gl.createTexture());
      leeLaTextura("Pipe", codigoPipes[pipes.length - 1]);
    }
    pipetx = 0;
    score = 0;
    despX_Textura = 0;
    incX = 1/3
    dibuja()
  }
});

function main() {
  canvas = document.getElementById("webglcanvas");
  gl = canvas.getContext("webgl2");
  if (!gl) {
    document.write("WebGL 2.0 no está disponible en tu navegador");
    return;
  }
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  compilaEnlazaLosShaders();

  /* Se crean los objetos */
  background = new Rectangulo(gl);
  codigoBackground = gl.createTexture();
  leeLaTextura("Background", codigoBackground);

  bird = new Rectangulo(gl, -0.25, -0.25, 0.25, 0.25, 0, 0, 1/3, 1, -2.75);
  codigoBird = gl.createTexture();
  leeLaTextura("Bird", codigoBird);

  numeros = {
    0: {
      num: new Rectangulo(gl, -5, 4.25, -4.5, 5),
      cod: gl.createTexture(),
    },
    1: {
      num: new Rectangulo(gl, -5, 4.25, -4.5, 5),
      cod: gl.createTexture(),
    },
    2: {
      num: new Rectangulo(gl, -5, 4.25, -4.5, 5),
      cod: gl.createTexture(),
    },
    3: {
      num: new Rectangulo(gl, -5, 4.25, -4.5, 5),
      cod: gl.createTexture(),
    },
    4: {
      num: new Rectangulo(gl, -5, 4.25, -4.5, 5),
      cod: gl.createTexture(),
    },
    5: {
      num: new Rectangulo(gl, -5, 4.25, -4.5, 5),
      cod: gl.createTexture(),
    },
    6: {
      num: new Rectangulo(gl, -5, 4.25, -4.5, 5),
      cod: gl.createTexture(),
    },
    7: {
      num: new Rectangulo(gl, -5, 4.25, -4.5, 5),
      cod: gl.createTexture(),
    },
    8: {
      num: new Rectangulo(gl, -5, 4.25, -4.5, 5),
      cod: gl.createTexture(),
    },
    9: {
      num: new Rectangulo(gl, -5, 4.25, -4.5, 5),
      cod: gl.createTexture(),
    },
  }
  for (let i = 0; i < 10; i++) {
    leeLaTextura(i.toString(), numeros[i].cod);
  }

  for (let i = 0; i < 4; i++) {
    const y = Math.random() * 4 - 3;

    pipes.push(new Pipe(gl, i, -5, y));
    codigoPipes.push(gl.createTexture());
    leeLaTextura("Pipe", codigoPipes[pipes.length - 1]);

    pipes.push(new Pipe(gl, i, 5, y + 2));
    codigoPipes.push(gl.createTexture());
    leeLaTextura("Pipe", codigoPipes[pipes.length - 1]);
  }

  gl.useProgram(programaID);
  uMatrizProyeccion = gl.getUniformLocation(programaID, "uMatrizProyeccion");
  uMatrizVista = gl.getUniformLocation(programaID, "uMatrizVista");
  uMatrizModelo = gl.getUniformLocation(programaID, "uMatrizModelo");
  uUnidadDeTextura = gl.getUniformLocation(programaID, "uUnidadDeTextura");
  uMatrizTextura = gl.getUniformLocation(programaID, "uMatrizTextura");

  ortho(MatrizProyeccion, -5, 5, -5, 5, -5, 5);
  gl.uniformMatrix4fv(uMatrizProyeccion, false, MatrizProyeccion);
  identidad(MatrizVista);
  gl.uniformMatrix4fv(uMatrizVista, false, MatrizVista);

  /* Para renderizar objetos transparentes (se considera el valor alfa) */
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  gl.clearColor(176 / 255, 196 / 255, 222 / 256, 1);
  dibuja();
}

window.onload = main;
