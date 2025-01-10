vec2 size = vec2(cells_size());
float aspect = size.x / size.y;
vec2 uvSquare = (
    aspect > 1.0
    ? vec2(0.5 + (UV.x - 0.5) * aspect, UV.y)
    : vec2(UV.x, 0.5 + (UV.y - 0.5) / aspect)
);
if (distance(uvSquare, mouseSquare) < brushSize) {
    FOut = vec4(hash(ivec3(I, seed)), 1);
} else {
    FOut = cells(I);
}
