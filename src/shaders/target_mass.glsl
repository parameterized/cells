uniform vec3 p[${p_size}];
uniform int tile;

void fragment() {
    int paramGridX = min(max(int(UV.x * float(tile)), 0), tile - 1);
    int paramGridY = min(max(int(UV.y * float(tile)), 0), tile - 1);
    int o = ((tile - 1 - paramGridY) * tile + paramGridX) * 33;

    mat3 perceptDists = mat3(p[o+0], p[o+1], p[o+2]);
    mat3 perceptSharp = mat3(p[o+3], p[o+4], p[o+5]);
    vec3 w1[18] = vec3[](
        p[o+6], p[o+7], p[o+8], p[o+9], p[o+10], p[o+11],
        p[o+12], p[o+13], p[o+14], p[o+15], p[o+16], p[o+17],
        p[o+18], p[o+19], p[o+20], p[o+21], p[o+22], p[o+23]
    );
    vec3 bias1[2] = vec3[](p[o+24], p[o+25]);
    vec3 w2[6] = vec3[](
        p[o+26], p[o+27], p[o+28], p[o+29], p[o+30], p[o+31]
    );
    vec3 bias2 = p[o+32];

    mat3 percept;
    mat3 perceptDivisor;

    for (int k = 0; k < 81; k++) {
        ivec2 offset = ivec2(k % 9 - 4, k / 9 - 4);
        if (offset == ivec2(0)) { continue; }
        ivec2 neighborPos = (
            I + offset + cells_size()
        ) % cells_size();

        float dist = length(vec2(offset)) / 5.0;
        float circleMask = dist <= 1.0 ? 1.0 : 0.0;
        mat3 shiftedDists = dist - perceptDists;
        mat3 absDists = mat3(
            abs(shiftedDists[0]),
            abs(shiftedDists[1]),
            abs(shiftedDists[2])
        );
        mat3 contribution = mat3(
            exp(-perceptSharp[0] * absDists[0]),
            exp(-perceptSharp[1] * absDists[1]),
            exp(-perceptSharp[2] * absDists[2])
        ) * circleMask;
        perceptDivisor += contribution;

        vec3 rgb = cells(neighborPos).rgb;
        percept += mat3(
            contribution[0] * rgb,
            contribution[1] * rgb,
            contribution[2] * rgb
        );
    }

    percept /= perceptDivisor;

    mat3 p = percept;

    vec3 h0 = max(vec3(0), bias1[0] + vec3(
        dot(w1[0], p[0]) + dot(w1[1], p[1]) + dot(w1[2], p[2]),
        dot(w1[3], p[0]) + dot(w1[4], p[1]) + dot(w1[5], p[2]),
        dot(w1[6], p[0]) + dot(w1[7], p[1]) + dot(w1[8], p[2])
    ));
    vec3 h1 = max(vec3(0), bias1[1] + vec3(
        dot(w1[9], p[0]) + dot(w1[10], p[1]) + dot(w1[11], p[2]),
        dot(w1[12], p[0]) + dot(w1[13], p[1]) + dot(w1[14], p[2]),
        dot(w1[15], p[0]) + dot(w1[16], p[1]) + dot(w1[17], p[2])
    ));

    vec3 targetMass = vec3(
        bias2.r + dot(w2[0], h0) + dot(w2[1], h1),
        bias2.g + dot(w2[2], h0) + dot(w2[3], h1),
        bias2.b + dot(w2[4], h0) + dot(w2[5], h1)
    );
    targetMass = clamp(targetMass, 0.0, 1.0);
    FOut = vec4(targetMass, 1.0);
}
