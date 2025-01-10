vec3 massTransfer(ivec2 pos, ivec2 dir) {
    pos = (pos + Src_size()) % Src_size();
    ivec2 dirPos = (pos + dir + Src_size()) % Src_size();

    vec2 posUV = (vec2(pos) + vec2(0.5)) / vec2(targetMass_size());
    vec2 dirUV = (vec2(dirPos) + vec2(0.5)) / vec2(targetMass_size());
    int gridY = int(floor(posUV.y * tile));
    int gridYDir = int(floor(dirUV.y * tile));
    if (solidVerticalBorders && gridYDir != gridY) {
        return vec3(0);
    }

    vec3 iWants = targetMass(pos).rgb - Src(pos).rgb;
    vec3 dirWants = targetMass(dirPos).rgb - Src(dirPos).rgb;

    vec3 iMassClamped = clamp(Src(pos).rgb, 0.0, 1.0);
    vec3 dirMassClamped = clamp(Src(dirPos).rgb, 0.0, 1.0);

    vec3 maxDirAccept = (1.0 - dirMassClamped) / 8.0;
    vec3 minDirAccept = -dirMassClamped / 8.0;
    vec3 maxIAccept = (1.0 - iMassClamped) / 8.0;
    vec3 minIAccept = -iMassClamped / 8.0;

    vec3 gravGiveDir = mix(
        max(minDirAccept, -maxIAccept),
        min(maxDirAccept, -minIAccept),
        -gravity * float(dir.y) * 0.5 + 0.5
    );
    vec3 targetGiveDir = clamp(
        (dirWants - iWants) / 32.0,
        max(minDirAccept, -maxIAccept),
        min(maxDirAccept, -minIAccept)
    );
    float mass = mix(
        dot(targetMass(pos).rgb, vec3(1.0 / 3.0)),
        dot(targetMass(dirPos).rgb, vec3(1.0 / 3.0)),
        0.5
    );
    vec3 giveDir = mix(
        targetGiveDir,
        gravGiveDir,
        (1.0 - abs(float(dir.x))) * (1.0 - mass) * abs(gravity)
    );

    return giveDir;
}

void fragment() {
    FOut = Src(I);
    if (FOut.a == 0.0) {
        FOut = vec4(hash(ivec3(I, seed)), 1);
        return;
    }

    for (int k = 0; k < 9; k++) {
        ivec2 offset = ivec2(k % 3 - 1, k / 3 - 1);
        if (offset == ivec2(0)) { continue; }
        FOut.rgb += (
            massTransfer(I + offset, -offset)
            - massTransfer(I, offset)
        );
    }
}
