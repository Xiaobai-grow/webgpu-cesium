// builtin/color.wgsl
// 用途：sRGB ↔ 线性、亮度。
// 依赖 defines：无。
// 期望绑定：无。

fn srgbToLinear(value: f32) -> f32 {
    if (value <= 0.04045) {
        return value / 12.92;
    }
    return pow((value + 0.055) / 1.055, 2.4);
}

fn srgbToLinear3(srgb: vec3<f32>) -> vec3<f32> {
    return vec3<f32>(srgbToLinear(srgb.r), srgbToLinear(srgb.g), srgbToLinear(srgb.b));
}

fn linearToSrgb(value: f32) -> f32 {
    if (value <= 0.0031308) {
        return value * 12.92;
    }
    return 1.055 * pow(value, 1.0 / 2.4) - 0.055;
}

fn linearToSrgb3(linear: vec3<f32>) -> vec3<f32> {
    return vec3<f32>(linearToSrgb(linear.r), linearToSrgb(linear.g), linearToSrgb(linear.b));
}

fn luminance(color: vec3<f32>) -> f32 {
    return dot(color, vec3<f32>(0.2126, 0.7152, 0.0722));
}
