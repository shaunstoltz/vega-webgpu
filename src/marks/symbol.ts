import {createBuffer} from '../util/arrays';
import {color} from 'd3-color';
//@ts-ignore
import shaderSource from '../shaders/symbol.wgsl';

interface Symbol {
  x: number;
  y: number;
  size: number;
  fill: string;
  opacity: number;
}

function draw(ctx: GPUCanvasContext, scene: {items: Array<Symbol>}, tfx: [number, number]) {
  const {items} = scene;
  if (!items?.length) {
    return;
  }
  const itemCount = items.length;
  const device = this._device;
  const shader = device.createShaderModule({
    code: shaderSource
  });
  const pipeline = device.createRenderPipeline({
    vertex: {
      module: shader,
      entryPoint: 'main_vertex',
      buffers: [
        {
          arrayStride: Float32Array.BYTES_PER_ELEMENT * 2,
          attributes: [
            // position
            {
              shaderLocation: 0,
              offset: 0,
              format: 'float32x2'
            }
          ]
        },
        {
          arrayStride: Float32Array.BYTES_PER_ELEMENT * 7,
          stepMode: 'instance',
          attributes: [
            // center
            {
              shaderLocation: 1,
              offset: 0,
              format: 'float32x2'
            },
            // color
            {
              shaderLocation: 2,
              offset: Float32Array.BYTES_PER_ELEMENT * 2,
              format: 'float32x4'
            },
            // radius
            {
              shaderLocation: 3,
              offset: Float32Array.BYTES_PER_ELEMENT * 6,
              format: 'float32'
            }
          ]
        }
      ]
    },
    fragment: {
      module: shader,
      entryPoint: 'main_fragment',
      targets: [
        {
          format: this._swapChainFormat,
          blend: {
            alpha: {
              srcFactor: 'one',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add'
            },
            color: {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add'
            }
          }
        }
      ]
    },
    primitive: {
      topology: 'triangle-list'
    }
  });

  const segments = 32;
  const positions = new Float32Array(
    Array.from({length: segments}, (_, i) => {
      const j = (i + 1) % segments;
      const ang1 = !i ? 0 : ((Math.PI * 2.0) / segments) * i;
      const ang2 = !j ? 0 : ((Math.PI * 2.0) / segments) * j;
      const x1 = Math.cos(ang1);
      const y1 = Math.sin(ang1);
      const x2 = Math.cos(ang2);
      const y2 = Math.sin(ang2);
      return [x1, y1, 0, 0, x2, y2];
    }).flat()
  );

  const attributes = [];

  for (let i = 0; i < itemCount; i++) {
    const {x = 0, y = 0, size, fill, opacity = 0} = items[i];
    const col = color(fill).rgb();
    const rad = Math.sqrt(size) / 2;
    const r = col.r / 255;
    const g = col.g / 255;
    const b = col.b / 255;
    attributes.push(x, y, r, g, b, opacity, rad);
  }

  const attributesBuffer = createBuffer(device, Float32Array.from(attributes), GPUBufferUsage.VERTEX);

  const uniforms = new Float32Array([...this._uniforms.resolution, ...tfx]);
  const uniformBuffer = createBuffer(device, uniforms, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
  const uniformBindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer
        }
      }
    ]
  });

  const commandEncoder = device.createCommandEncoder();
  //@ts-ignore
  const textureView = ctx.getCurrentTexture().createView();
  const renderPassDescriptor = {
    colorAttachments: [
      {
        view: textureView,
        loadValue: 'load',
        storeOp: 'store'
      }
    ]
  };

  const positionBuffer = createBuffer(device, positions, GPUBufferUsage.VERTEX);

  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  passEncoder.setPipeline(pipeline);
  passEncoder.setVertexBuffer(0, positionBuffer);
  passEncoder.setVertexBuffer(1, attributesBuffer);
  passEncoder.setBindGroup(0, uniformBindGroup);
  passEncoder.draw(segments * 3, itemCount, 0, 0);
  passEncoder.endPass();
  device.queue.submit([commandEncoder.finish()]);
}

export default {
  type: 'symbol',
  draw: draw
};
