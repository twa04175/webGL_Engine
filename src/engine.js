main();

function main() {
    const canvas = document.querySelector('#glcanvas');
    const gl = canvas.getContext('webgl'); //캔버스 웹 GL 로 활성화

    if (!gl) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
        return;
    }

    // 버택스 셰이더 코드
    const vsSource = `
    attribute vec4 aVertexPosition;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    void main() {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    }
  `;

    // 픽셀 셰이더 코드
    const fsSource = `
    void main() {
      gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    }
  `;

    //쉐이더 컴파일
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    // 셰이더 프로그램을 사용하는 데 필요한 모든 정보를 수집합니다.
    // 셰이더 프로그램이 사용하는 속성을 찾습니다.
    // VertexPosition에 대해 균일한 위치를 찾습니다.
    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        },
    };

    // 여기에서 모든 것을 빌드하는 루틴을 호출합니다.
    // 우리가 그릴 객체.
    const buffers = initBuffers(gl);

    //그리기 시작
    drawScene(gl, programInfo, buffers);
}


// 초기화 버퍼
function initBuffers(gl) {

    // 사각형의 위치에 대한 버퍼를 만듭니다.
    const positionBuffer = gl.createBuffer();

    // 버퍼를 적용할 positionBuffer를 선택
    // 여기에서 작업을 수행합니다.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);


    // 이제 사각형의 위치 배열을 만듭니다.
    const positions = [
        1.0,  1.0,
        -1.0,  1.0,
        1.0, -1.0,
        -1.0, -1.0,
    ];


    // 이제 위치 목록을 WebGL에 전달하여 빌드합니다.
    // 모양. 우리는 Float32Array를 생성함으로써 이를 수행합니다.
    // JavaScript 배열을 사용하여 현재 버퍼를 채웁니다.
    gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array(positions),
        gl.STATIC_DRAW);
    return {
        position: positionBuffer,
    };
}

//씬 그리기
function drawScene(gl, programInfo, buffers) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0); // 배경 검정색
    gl.clearDepth(1.0);                                // 모두 지우기
    gl.enable(gl.DEPTH_TEST);                                 // 깊이 테스트 활성화
    gl.depthFunc(gl.LEQUAL);                                  // 가까운 오브젝트가 먼 오브젝트 무시


    // 캔버스에 그리기를 시작하기 전에 캔버스를 지웁니다.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 다음과 같은 특수 행렬인 원근 행렬을 만듭니다.
    // 카메라에서 원근 왜곡을 시뮬레이션하는 데 사용됩니다.
    // 우리의 시야는 너비/높이가 있는 45도입니다.
    // 캔버스의 디스플레이 크기와 일치하는 비율
    // 그리고 우리는 0.1 단위 사이의 객체만 보고 싶습니다.
    // 카메라에서 100단위 떨어져 있습니다.

    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    //투영공간 행렬 생성
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    // 그리기 위치를 "identity" 지점으로 설정합니다.
    // 장면의 중심.
    const modelViewMatrix = mat4.create();


    // 이제 그리기 위치를 원하는 위치로 약간 이동합니다.
    // 사각형 그리기를 시작합니다.
    mat4.translate(modelViewMatrix,     // destination matrix
        modelViewMatrix,     // matrix to translate
        [-0.0, 0.0, -6.0]);  // amount to translate

    // WebGL에게 위치에서 위치를 가져오는 방법을 알려줍니다.
    // vertexPosition 속성에 버퍼링합니다.
    {
        const numComponents = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexPosition);
    }

    // 커스텀 셰이더를 사용한 드로잉 지시
    gl.useProgram(programInfo.program);

    // 셰이더 유니폼 설정
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix);
    {
        const offset = 0;
        const vertexCount = 4;
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }
}

// WebGL이 데이터를 그리는 방법을 알 수 있도록 셰이더 프로그램을 초기화합니다.
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // 셰이더 프로그램 생성
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // 생성 실패 시 경고
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}

// 주어진 유형의 셰이더를 생성하고 소스를 업로드 & 컴파일합니다.
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);


    // 셰이더 소스 입력
    gl.shaderSource(shader, source);
    // 셰이더 프로그램 컴파일
    gl.compileShader(shader);

    //컴파일 성공 여부 체크
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

