[[block]] struct Uniforms {
    resolution: vec2<f32>;
    origin: vec2<f32>;
    scale: vec2<f32>;
};

[[block]] struct ColorUniforms {
    fill: vec4<f32>;
    stroke: vec4<f32>;
    strokewidth: f32;
};

[[group(0), binding(0)]] var<uniform> uniforms : Uniforms; 
[[group(0), binding(1)]] var<uniform> colors : ColorUniforms; 

let uvs : array<vec2<f32>, 6> = array<vec2<f32>, 6>(
    vec2<f32>(1.0, 0.0),
    vec2<f32>(1.0, 1.0),
    vec2<f32>(0.0, 1.0),
    vec2<f32>(1.0, 0.0),
    vec2<f32>(0.0, 1.0),
    vec2<f32>(0.0, 0.0));


struct VertexOutput {
    [[builtin(position)]] pos : vec4<f32>;
    [[location(0)]] uv : vec2<f32>;
};

[[stage(vertex)]]
fn main_vertex([[location(0)]] position : vec2<f32>, [[builtin(vertex_index)]] idx : u32) -> VertexOutput {
    var output: VertexOutput;
    var pos : vec2<f32> = position * uniforms.scale + uniforms.origin;
    pos = pos / uniforms.resolution;
    pos.y = 1.0 - pos.y;
    pos = vec2<f32>(pos * 2.0) - 1.0;
    output.pos = vec4<f32>(pos, 0.0, 1.0);
    output.uv = uvs[idx];
    return output;
}

[[stage(fragment)]]
fn main_fragment([[location(0)]] uv : vec2<f32>) -> [[location(0)]] vec4<f32> {
    var col : vec4<f32> = colors.fill;
    let sw : vec2<f32> = vec2<f32>(colors.strokewidth, colors.strokewidth) * 2.0 / uniforms.resolution;
    if (uv.x < sw.x || uv.x > 1.0-sw.x) {
        col = colors.stroke;
    }
    if (uv.y < sw.y || uv.y > 1.0-sw.y) {
        col = colors.stroke;
    }
    return col;
}