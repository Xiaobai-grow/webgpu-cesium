// builtin/encoding.wgsl
// 用途：八面体法线编码。
// 依赖 defines：无。
// 期望绑定：无。

fn octEncode(n: vec3<f32>) -> vec2<f32> {
    var p = n.xy / (abs(n.x) + abs(n.y) + abs(n.z));
    if (n.z < 0.0) {
        let sx = select(-1.0, 1.0, p.x >= 0.0);
        let sy = select(-1.0, 1.0, p.y >= 0.0);
        p = (vec2<f32>(1.0) - abs(p.yx)) * vec2<f32>(sx, sy);
    }
    return p * 0.5 + 0.5;
}

fn octDecode(f: vec2<f32>) -> vec3<f32> {
    let u = f * 2.0 - 1.0;
    var n = vec3<f32>(u.x, u.y, 1.0 - abs(u.x) - abs(u.y));
    let t = max(-n.z, 0.0);
    n.x += select(t, -t, n.x >= 0.0);
    n.y += select(t, -t, n.y >= 0.0);
    return normalize(n);
}
