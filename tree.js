var TreeType = Object.freeze({
	NORMAL: 0,
	CANOPY: 1,
	EVERGREEN: 2
});

var BranchType = Object.freeze({
	BENT: 0,
	JAGGED: 1,
	NORMAL: 2
});

var BranchLift = Object.freeze({
	NONE: 0,
	OUT: 1,
	IN: 2
});

var FoliageType = Object.freeze({
	PANEL: 0,
	SHIELD: 1,
	SAG: 2,
	BOWL: 3,
	UMBRELLA: 4
});

// Convention: underscore-suffixed names are private

// gl-matrix.js or gl-matrix-min.js must be evaluated before this file

function Leaf(size, position, angle, color, dist, neighbor) {
	this.size = size;
	this.position = position;
	this.angle = angle;
	this.color = color;
	this.dist = dist;
	this.neighbor = neighbor;
}

function Tree(tree_type, foliage_type, funnel, trunk_type, position) {
	this.tree_type_ = tree_type;
	this.foliage_type_ = foliage_type;
	this.funnel_ = funnel;
	this.trunk_type_ = trunk_type;
	this.bend_freq_ = 1.0 + (Math.random()*2) + Math.random();
	this.model_ = mat4.create();
	// Tree-building and object-placing code assumes positive Z is "up", but it's
	// actually "into the screen".  Fix by rotating the model matrix.
	mat4.rotateX(this.model_, this.model_, -Math.PI / 2);

	// Now move it into place
	mat4.translate(this.model_, this.model_, position);
}

const SEGMENTS_PER_METER = 0.25;
const MIN_RADIUS = 0.3;
const TEXTURE_SIZE = 256;

// Returns a vec4; first three entries are x,y,z of the center of the trunk at
// the passed-in height, fourth entry is the radius at that point
Tree.prototype.trunkPos_ = function(height, base_radius, _current_height) {
	var delta_curve, bend = height*height, trunk = vec4.create();

	if (this.funnel_) {
		delta_curve = 1.0 - (1.0-height)*(1.0-height);
	} else {
		delta_curve = height;
	}

	if (this.tree_type_ == TreeType.CANOPY) {
		trunk[3] = base_radius * (1.0-delta_curve*0.5);
	} else {
		trunk[3] = base_radius * (1.0-delta_curve);
	}

	if (trunk[3] < MIN_RADIUS) trunk[3] = MIN_RADIUS;

	switch(this.trunk_type_) {
		case BranchType.BENT:
			trunk[0] = bend * _current_height / 3.0;
			// keep y==0
			break;
		case BranchType.JAGGED:
			trunk[0] = bend * _current_height / 2.0;
			trunk[1] = Math.sin(height * this.bend_freq_) * _current_height / 3.0;
			break;
		case BranchType.NORMAL:
			// keep (x,y)==(0,0)
			break;
	}

	trunk[2] = height * _current_height;

	return trunk;
};

// Adds vertices and indices for the foliage to the appropriate lists
Tree.prototype.makeFoliage_ = function(vertices, pushTri, pushQuad, vertex, fsize, angle, model) {
	var uvTL = vec2.fromValues(0.25, 0.0),
	    uvTR = vec2.fromValues(0.5, 0.0),
	    uvBR = vec2.fromValues(0.5, 1.0),
	    uvBL = vec2.fromValues(0.25, 1.0),
	    base_index = vertices.length,
	    vert, norm, uv = vec2.create(),
	    tip_height = fsize / 4.0;

	// don't let foliage touch the ground
	if (fsize < (vertex[2] - 2.0)) {
		fsize = (vertex[2] - 2.0);
	}
	if (fsize < 0.1) {
		return;
	}

	var model_temp = mat4.create();
	mat4.translate(model_temp, model, vertex);
	mat4.rotateZ(model_temp, model_temp, angle);

	model = model_temp;

	switch(this.foliage_type_) {
		case FoliageType.PANEL:
			norm = vec3.fromValues(0.0, 0.0, 1.0);

			vert = vec4.fromValues(0.0,  -fsize, -fsize, 0.0);
			vertices.push(new Vertex(vert, norm, uvTL, model));

			vert = vec4.fromValues(-1.0,  fsize, -fsize, 0.0);
			vertices.push(new Vertex(vert, norm, uvTR, model));

			vert = vec4.fromValues(-1.0,  fsize,  fsize, 0.0);
			vertices.push(new Vertex(vert, norm, uvBR, model));

			vert = vec4.fromValues(0.0,  -fsize,  fsize, 0.0);
			vertices.push(new Vertex(vert, norm, uvBL, model));

			vert = vec4.fromValues(0.0,  -fsize, -fsize, 0.0);
			vertices.push(new Vertex(vert, norm, uvTR, model));

			vert = vec4.fromValues(1.0,   fsize, -fsize, 0.0);
			vertices.push(new Vertex(vert, norm, uvBR, model));

			vert = vec4.fromValues(1.0,   fsize,  fsize, 0.0);
			vertices.push(new Vertex(vert, norm, uvBL, model));

			vert = vec4.fromValues(0.0,  -fsize,  fsize, 0.0);
			vertices.push(new Vertex(vert, norm, uvTL, model));

			pushQuad(base_index + 0, base_index + 1, base_index + 2, base_index + 3);
			pushQuad(base_index + 7, base_index + 6, base_index + 5, base_index + 4);

			break;
		case FoliageType.SHIELD:
			norm = vec3.fromValues(0.0, 0.0, 1.0);

			vert = vec4.fromValues(fsize / 2, 0.0,  0.0, 0.0);
			vec2.lerp(uv, uvTL, uvBR, 0.5);
			vertices.push(new Vertex(vert, norm, uv, model));

			vert = vec4.fromValues(0.0, -fsize, 0.0, 0.0);
			vertices.push(new Vertex(vert, norm, uvTL, model));

			vert = vec4.fromValues(0.0,  0.0,  fsize, 0.0);
			vertices.push(new Vertex(vert, norm, uvTR, model));

			vert = vec4.fromValues(0.0,  fsize, 0.0, 0.0);
			vertices.push(new Vertex(vert, norm, uvBR, model));

			vert = vec4.fromValues(0.0,  0.0,  -fsize, 0.0);
			vertices.push(new Vertex(vert, norm, uvBL, model));

			// uv is still the lerp'ed value
			vert = vec4.fromValues(-fsize / 2, 0.0,  0.0, 0.0);
			vertices.push(new Vertex(vert, norm, uv, model));

			pushTri(base_index, base_index + 1, base_index + 2);
			pushTri(base_index, base_index + 2, base_index + 3);
			pushTri(base_index, base_index + 3, base_index + 4);
			pushTri(base_index, base_index + 4, base_index + 1);
			pushTri(base_index + 5, base_index + 2, base_index + 1);
			pushTri(base_index + 5, base_index + 3, base_index + 2);
			pushTri(base_index + 5, base_index + 4, base_index + 3);
			pushTri(base_index + 5, base_index + 1, base_index + 4);

			break;
		case FoliageType.SAG:
			/*     /\
			      /__\
			     /|  |\
			     \|__|/
			      \  /
			       \/   */
			var level1 = fsize * -0.4,
			    level2 = fsize * -1.2,
			    uv_mid = vec2.create();
			var uv_innerTL = vec2.fromValues(0.25 + 1.25, 0.125),
			    uv_innerTR = vec2.fromValues(0.5 - 0.125, 0.125),
			    uv_innerBR = vec2.fromValues(0.5 - 0.125, 1.0 - 0.125),
			    uv_innerBL = vec2.fromValues(0.25 + 1.25, 1.0 - 0.125);

			norm = vec3.fromValues(0.0, 0.0, 1.0);

			// center
			vert = vec4.fromValues(0.0, 0.0, 0.0, 0.0);
			vec2.lerp(uv, uvTL, uvBR, 0.5);
			vertices.push(new Vertex(vert, norm, uv, model));

			// first ring
			vert = vec4.fromValues(-fsize / 2, -fsize / 2, level1, 0.0);
			vec2.lerp(uv_mid, uvTL, uvTR, 0.5);
			vertices.push(new Vertex(vert, norm, vec2.clone(uv_mid), model));

			vert = vec4.fromValues( fsize / 2, -fsize / 2, level1, 0.0);
			vec2.lerp(uv_mid, uvTR, uvBR, 0.5);
			vertices.push(new Vertex(vert, norm, vec2.clone(uv_mid), model));

			vert = vec4.fromValues( fsize / 2,  fsize / 2, level1, 0.0);
			vec2.lerp(uv_mid, uvBL, uvBR, 0.5);
			vertices.push(new Vertex(vert, norm, vec2.clone(uv_mid), model));

			vert = vec4.fromValues(-fsize / 2,  fsize / 2, level1, 0.0);
			vec2.lerp(uv_mid, uvTL, uvBL, 0.5);
			vertices.push(new Vertex(vert, norm, vec2.clone(uv_mid), model));

			// tips
			vert = vec4.fromValues(0.0, -fsize, level2, 0.0);
			vertices.push(new Vertex(vert, norm, uvTR, model));

			vert = vec4.fromValues(fsize,  0.0, level2, 0.0);
			vertices.push(new Vertex(vert, norm, uvBR, model));

			vert = vec4.fromValues(0.0,  fsize, level2, 0.0);
			vertices.push(new Vertex(vert, norm, uvBL, model));

			vert = vec4.fromValues(-fsize, 0.0, level2, 0.0);
			vertices.push(new Vertex(vert, norm, uvTL, model));

			// center, but lower
			vert = vec4.fromValues( 0.0, 0.0, level1 / 16, 0.0);
			vertices.push(new Vertex(vert, norm, uv, model));

			// indices
			// cap
			pushTri(base_index, base_index + 2, base_index + 1);
			pushTri(base_index, base_index + 3, base_index + 2);
			pushTri(base_index, base_index + 4, base_index + 3);
			pushTri(base_index, base_index + 1, base_index + 4);
			// outer triangles
			pushTri(base_index + 5, base_index + 1, base_index + 2);
			pushTri(base_index + 6, base_index + 2, base_index + 3);
			pushTri(base_index + 7, base_index + 3, base_index + 4);
			pushTri(base_index + 8, base_index + 4, base_index + 1);

			break;
		case FoliageType.BOWL:
			tip_height *= -1.0;

			vert = vec4.fromValues(0.0, 0.0, tip_height, 0.0);
			norm = vec3.fromValues(0.0, 0.0, 1.0);
			vec2.lerp(uv, uvTL, uvBR, 0.5);
			vertices.push(new Vertex(vert, norm, uv, model));

			vert = vec4.fromValues(-fsize, -fsize, -tip_height, 0.0);
			norm = vec3.fromValues(-0.5, -0.5, 0.0);
			vertices.push(new Vertex(vert, norm, uvTL, model));

			vert = vec4.fromValues(fsize, -fsize, -tip_height, 0.0);
			norm = vec3.fromValues( 0.5, -0.5, 0.0);
			vertices.push(new Vertex(vert, norm, uvTR, model));

			vert = vec4.fromValues(fsize, fsize, -tip_height, 0.0);
			norm = vec3.fromValues( 0.5, 0.5, 0.0);
			vertices.push(new Vertex(vert, norm, uvBR, model));

			vert = vec4.fromValues(-fsize, fsize, -tip_height, 0.0);
			norm = vec3.fromValues(-0.5, 0.5, 0.0);
			vertices.push(new Vertex(vert, norm, uvBL, model));

			vert = vec4.fromValues(0.0, 0.0, tip_height / 2, 0.0);
			norm = vec3.fromValues(0.0, 0.0, 1.0);
			vertices.push(new Vertex(vert, norm, uv, model));

			pushTri(base_index, base_index + 1, base_index + 2);
			pushTri(base_index, base_index + 2, base_index + 3);
			pushTri(base_index, base_index + 3, base_index + 4);
			pushTri(base_index, base_index + 4, base_index + 1);

			pushTri(base_index + 5, base_index + 2, base_index + 1);
			pushTri(base_index + 5, base_index + 3, base_index + 2);
			pushTri(base_index + 5, base_index + 4, base_index + 3);
			pushTri(base_index + 5, base_index + 1, base_index + 4);

			//pushQuad(base_index + 1, base_index + 4, base_index + 3, base_index + 2);

			break;
		case FoliageType.UMBRELLA:
			vert = vec4.fromValues(0.0, 0.0, tip_height, 0.0);
			norm = vec3.fromValues(0.0, 0.0, 1.0);
			vec2.lerp(uv, uvTL, uvBR, 0.5);
			vertices.push(new Vertex(vert, norm, uv, model));

			vert = vec4.fromValues(-fsize, -fsize, -tip_height, 0.0);
			norm = vec3.fromValues(-0.5, -0.5, 0.0);
			vertices.push(new Vertex(vert, norm, uvTL, model));

			vert = vec4.fromValues(fsize, -fsize, -tip_height, 0.0);
			norm = vec3.fromValues(0.5, -0.5, 0.0);
			vertices.push(new Vertex(vert, norm, uvTR, model));

			vert = vec4.fromValues(fsize, fsize, -tip_height, 0.0);
			norm = vec3.fromValues(0.5, 0.5, 0.0);
			vertices.push(new Vertex(vert, norm, uvBR, model));

			vert = vec4.fromValues(-fsize, fsize, -tip_height, 0.0);
			norm = vec3.fromValues(-0.5, 0.5, 0.0);
			vertices.push(new Vertex(vert, norm, uvBL, model));

			vert = vec4.fromValues(0.0, 0.0, tip_height / 2, 0.0);
			norm = vec3.fromValues(0.0, 0.0, 1.0);
			// uv still has the previous lerp'ed value
			vertices.push(new Vertex(vert, norm, uv, model));

			pushTri(base_index, base_index + 2, base_index + 1);
			pushTri(base_index, base_index + 3, base_index + 2);
			pushTri(base_index, base_index + 4, base_index + 3);
			pushTri(base_index, base_index + 1, base_index + 4);

			break;
	}
};

// Same for vines
Tree.prototype.makeVines_ = function(vertices, pushQuad, bottom_points, model) {
	var base_index = vertices.length,
	    vert, norm = vec3.fromValues(0.0, 0.0, 1.0), uv,
	    vert_2 = vec4.create();

	// if (!has_vines_) return;

	for (var segment = 0; segment < bottom_points.length; segment++) {
		vert = vec4.clone(bottom_points[segment]);
		vertices.push(new Vertex(vert, norm, vec2.fromValues(0.75, segment), model));
		vec4.add(vert_2, vert, vec4.fromValues(0.0, 0.0, -3.5, 0.0));
		vertices.push(new Vertex(vec4.clone(vert_2), norm, vec2.fromValues(0.5, segment), model));
	}

	for (var segment = 0; segment < bottom_points.length-1; segment++) {
		pushQuad(
			base_index + segment*2,
			base_index + segment*2 + 1,
			base_index + (segment + 1)*2,
			base_index + (segment + 1)*2 + 1
		);
	}
};

// Same for a branch
Tree.prototype.makeBranch_ = function(vertices, pushTri, pushQuad, anchor, angle, _branch_lift, model) {
	if (anchor.length < 2.0) return;
	if (anchor.radius < MIN_RADIUS) return;

	var segment_count = Math.floor(anchor.length * SEGMENTS_PER_METER),
	    base_index = vertices.length,
	    mat = mat4.create(),
	    segment_count = 5,
	    radial_steps = 6,
	    radial_edge = radial_steps + 1,
	    core = vec4.clone(anchor.root),
	    vert,
	    norm,
	    ring_angle,
	    underside_vertices = [];
	if (segment_count < 3) segment_count = 3;
	segment_count += 3;
	mat4.rotateZ(mat, mat, angle);

	for (var segment = 0; segment < segment_count + 1; segment++) {
		var horiz_pos = segment / (segment_count + 1.0), curve;
		// if (_lift_style == BranchLift.OUT) {
		//   curve = horiz_pos * horiz_pos;
		// } else if (_lift_style == BranchLift.IN) {
		//   curve = 1.0 - horiz_pos;
		//   curve *= curve * curve;
		//   curve = 1.0 - curve;
		// } else {
		curve = horiz_pos;
		// }
		var radius = anchor.root[3] * (1.0-horiz_pos);
		if (radius < MIN_RADIUS) radius = MIN_RADIUS;
		core[2] = anchor.root[2] + anchor.lift * curve * _branch_lift;
		// if this is the last segment, don't make a ring of points, make one,
		// in the center, so the branch can end at a point
		if (segment == segment_count) {
			vert = vec4.fromValues(0.0, anchor.length*horiz_pos, 0.0, 0.0);
			vec4.transformMat4(vert, vert, mat);
			vec4.add(vert, vert, core);
			norm = vec4.fromValues(vert[0], 0.0, vert[2]);
			vertices.push(new Vertex(vert, norm, vec2.fromValues(0.249, vert[1]), model));
		} else {
			for (var ring=0; ring<=radial_steps; ring++) {
				if (ring == radial_steps || ring == 0) {
					ring_angle = 0;
				} else {
					ring_angle = ring * 2 * Math.PI / radial_steps;
				}
				vert = vec4.fromValues(
					-Math.cos(ring_angle) * radius,
					anchor.length * horiz_pos,
					-Math.sin(ring_angle) * radius,
					0.0
				);
				vec4.transformMat4(vert, vert, mat);
				vec4.add(vert, vert, core);
				norm = vec3.fromValues(vert[0], 0.0, vert[2]);
				var uv = vec2.fromValues((ring / radial_steps) * 0.249, vert[1]);
				vertices.push(new Vertex(vert, norm, uv, model));
			}
		}
		underside_vertices.push(vert);
	}

	// now the indices
	for (var segment = 0; segment < segment_count; segment++) {
		for (var ring = 0; ring < radial_steps; ring++) {
			if (segment < segment_count-1) {
				// normal mid-branch segment
				pushQuad(
					base_index + (ring + 0) + (segment + 0) * (radial_edge),
					base_index + (ring + 0) + (segment + 1) * (radial_edge),
					base_index + (ring + 1) + (segment + 1) * (radial_edge),
					base_index + (ring + 1) + (segment + 0) * (radial_edge)
				);
			} else {
				// end-of-branch segment; use triangles
				pushTri(
					base_index + (ring + 1) + segment * (radial_edge),
					base_index + (ring + 0) + segment * (radial_edge),
					vertices.length - 1
				);
			}
		}
	}

	// grab the last point and use it as the origin for the foliage
	var last_vertex = vertices[vertices.length - 1].vertex;
	this.makeFoliage_(vertices, pushTri, pushQuad, last_vertex, anchor.length * 0.56, angle, model);

	this.makeVines_(vertices, pushQuad, underside_vertices, model);
}

Tree.drawBarkTexture_ = function(gl, posAttr, colorAttr, uvAttr, texAttr, texObj, bark_color) {
	var color_f32 = new Float32Array(4 * 4),
	    uv_f32 = new Float32Array(2 * 4),
	    vert_f32 = new Float32Array(3 * 4),
	    color_buf = gl.createBuffer(),
	    uv_buf = gl.createBuffer(),
	    vert_buf = gl.createBuffer();

	for (var i=0; i<4; i++) {
		color_f32.subarray(i * 4).set(bark_color);
	}

	var frame_count = Math.floor(texObj.height / texObj.width);
	if (frame_count < 1) frame_count = 1;
	var frame_size = 1.0 / frame_count,
	    frame = 0, //Math.floor(frame_count / 2),  // rand % frame_count
	    uvTL = vec2.fromValues(0.0, frame * frame_size),
	    uvTR = vec2.fromValues(1.0, frame * frame_size),
	    uvBR = vec2.fromValues(1.0, (frame+1) * frame_size),
	    uvBL = vec2.fromValues(0.0, (frame+1) * frame_size);

	gl.bindBuffer(gl.ARRAY_BUFFER, color_buf);
	gl.bufferData(gl.ARRAY_BUFFER, color_f32, gl.STATIC_DRAW);
	gl.vertexAttribPointer(colorAttr, 4, gl.FLOAT, false, 0, 0);

	uv_f32.subarray(0).set(uvTL);
	vert_f32.subarray(0).set(vec3.fromValues(0.0, 0.0, 0.0));

	uv_f32.subarray(1 * 2).set(uvTR);
	vert_f32.subarray(1 * 3).set(vec3.fromValues(TEXTURE_SIZE, 0.0, 0.0));

	uv_f32.subarray(2 * 2).set(uvBR);
	vert_f32.subarray(2 * 3).set(vec3.fromValues(TEXTURE_SIZE, TEXTURE_SIZE, 0.0));

	uv_f32.subarray(3 * 2).set(uvBL);
	vert_f32.subarray(3 * 3).set(vec3.fromValues(0.0, TEXTURE_SIZE, 0.0));

	gl.bindBuffer(gl.ARRAY_BUFFER, uv_buf);
	gl.bufferData(gl.ARRAY_BUFFER, uv_f32, gl.STATIC_DRAW);
	gl.vertexAttribPointer(uvAttr, 2, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, vert_buf);
	gl.bufferData(gl.ARRAY_BUFFER, vert_f32, gl.STATIC_DRAW);
	gl.vertexAttribPointer(posAttr, 3, gl.FLOAT, false, 0, 0);

	// FAN because this vertex set was set up for QUADS, but that doesn't exist anymore,
	// but FAN takes points in the same order for a quad.
	gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
};

Tree.drawLeafTexture_ = function(gl, posAttr, colorAttr, uvAttr, texAttr, texObj, leaf_color) {
	var leaves = [];

	if (1 /* TREE_LEAF_FAN */) {
		var total_steps = 5, size, step_size, leaf;
		for (var current_step = total_steps; current_step > 1; current_step--) {
			size = (TEXTURE_SIZE / 4) / (1.0 + (total_steps - current_step));
			step_size = 2*Math.PI / current_step;
			for (var x = 0; x < Math.PI; x += step_size) {
				var pos = vec2.fromValues(
					TEXTURE_SIZE / 2 + Math.cos(x)*size,
					TEXTURE_SIZE / 2 + Math.sin(x)*size
				);
				leaves.push(new Leaf(size, pos, x, vec4.create(), 0, 0));
			}
		}
	} else {
		// TODO: implement
	}

	leaves.foreach(function(leaf) {
		vec4.lerp(leaf.color, leaf_color, vec4.fromValues(0, 0.5, 0, 0), Math.random() * 0.33);
	});

	if (0  /* TREE_LEAF_SCATTER */) {
		// TODO: implement
	}

	var color_f32 = new Float32Array(4 * 4 * leaves.length),
	    uv_f32 = new Float32Array(2 * 4 * leaves.length),
	    vert_f32 = new Float32Array(3 * 4 * leaves.length),
	    color_buf = gl.createBuffer(),
	    uv_buf = gl.createBuffer(),
	    vert_buf = gl.createBuffer();

	leaves.foreach(function(leaf, i) {
		color_f32.subarray(i * 4 * 4).set(leaf.color);
		color_f32.subarray(i * 4 * 4 + 4).set(leaf.color);
		color_f32.subarray(i * 4 * 4 + 8).set(leaf.color);
		color_f32.subarray(i * 4 * 4 + 12).set(leaf.color);
	});

	gl.bindBuffer(gl.ARRAY_BUFFER, color_buf);
	gl.bufferData(gl.ARRAY_BUFFER, color_f32, gl.STATIC_DRAW);
	gl.vertexAttribPointer(colorAttr, 4, gl.FLOAT, false, 0, 0);

	var frame_count = Math.floor(texObj.height / texObj.width);
	if (frame_count < 1) frame_count = 1;
	var frame_size = 1.0 / frame_count,
	    frame = Math.floor(frame_count / 2),  // rand % frame_count
	    uvTL = vec2.fromValues(0.0, frame * frame_size),
	    uvTR = vec2.fromValues(1.0, frame * frame_size),
	    uvBR = vec2.fromValues(1.0, (frame+1) * frame_size),
	    uvBL = vec2.fromValues(0.0, (frame+1) * frame_size);

	leaves.foreach(function(leaf, i) {
		var pos = vec3.fromValues(leaf.position[0], leaf.position[1], 0.0),
		    rotation = mat3.create(),
		    posTL = vec3.create(), posTR = vec3.create(), posBR = vec3.create(),
		    posBL = vec3.create();
		mat3.rotate(rotation, rotation, leaf.angle);
		// Note, this only works because a vec3 embeds a vec2
		vec2.add(posTL, pos, vec2.fromValues(-leaf.size, -leaf.size));
		vec2.transformMat3(posTL, posTL, rotation);
		vec2.add(posTR, pos, vec2.fromValues(leaf.size, -leaf.size));
		vec2.transformMat3(posTR, posTR, rotation);
		vec2.add(posBR, pos, vec2.fromValues(leaf.size, leaf.size));
		vec2.transformMat3(posBR, posBR, rotation);
		vec2.add(posBL, pos, vec2.fromValues(-leaf.size, leaf.size));
		vec2.transformMat3(posBL, posBL, rotation);

		uv_f32.subarray(i * 2 * 4).set(uvTL);
		vert_f32.subarray(i * 3 * 4).set(posTL);

		uv_f32.subarray(i * 2 * 4 + 2).set(uvTR);
		vert_f32.subarray(i * 3 * 4 + 3).set(posTR);

		uv_f32.subarray(i * 2 * 4 + 4).set(uvBR);
		vert_f32.subarray(i * 3 * 4 + 6).set(posBR);

		uv_f32.subarray(i * 2 * 4 + 6).set(uvBL);
		vert_f32.subarray(i * 3 * 4 + 9).set(posBL);
	});

	gl.bindBuffer(gl.ARRAY_BUFFER, uv_buf);
	gl.bufferData(gl.ARRAY_BUFFER, uv_f32, gl.STATIC_DRAW);
	gl.vertexAttribPointer(uvAttr, 2, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, vert_buf);
	gl.bufferData(gl.ARRAY_BUFFER, vert_f32, gl.STATIC_DRAW);
	gl.vertexAttribPointer(posAttr, 3, gl.FLOAT, false, 0, 0);

	// FAN because this vertex set was set up for QUADS, but that doesn't exist anymore,
	// but FAN takes points in the same order for a quad.
	gl.drawArrays(gl.TRIANGLE_FAN, 0, 4 * leaves.length);
};

Tree.drawVineTexture_ = function(gl, posAttr, colorAttr, uvAttr, texAttr, texObj, leaf_color) {
	var color_f32 = new Float32Array(4 * 4),
	    uv_f32 = new Float32Array(2 * 4),
	    vert_f32 = new Float32Array(3 * 4),
	    color_buf = gl.createBuffer(),
	    uv_buf = gl.createBuffer(),
	    vert_buf = gl.createBuffer();

	for (var i=0; i<4; i++) {
		color_f32.subarray(i * 4).set(leaf_color);
	}

	var frame_count = Math.floor(texObj.height / texObj.width);
	if (frame_count < 1) frame_count = 1;
	var frame_size = 1.0 / frame_count,
	    frame = Math.floor(frame_count / 2),  // rand % frame_count
	    uvTL = vec2.fromValues(0.0, frame * frame_size),
	    uvTR = vec2.fromValues(1.0, frame * frame_size),
	    uvBR = vec2.fromValues(1.0, (frame+1) * frame_size),
	    uvBL = vec2.fromValues(0.0, (frame+1) * frame_size);

	gl.bindBuffer(gl.ARRAY_BUFFER, color_buf);
	gl.bufferData(gl.ARRAY_BUFFER, color_f32, gl.STATIC_DRAW);
	gl.vertexAttribPointer(colorAttr, 4, gl.FLOAT, false, 0, 0);

	uv_f32.subarray(0).set(uvBL);
	vert_f32.subarray(0).set(vec3.fromValues(0.0, 0.0, 0.0));

	uv_f32.subarray(1 * 2).set(uvTL);
	vert_f32.subarray(1 * 3).set(vec3.fromValues(TEXTURE_SIZE, 0.0, 0.0));

	uv_f32.subarray(2 * 2).set(uvTR);
	vert_f32.subarray(2 * 3).set(vec3.fromValues(TEXTURE_SIZE, TEXTURE_SIZE, 0.0));

	uv_f32.subarray(3 * 2).set(uvBR);
	vert_f32.subarray(3 * 3).set(vec3.fromValues(0.0, TEXTURE_SIZE, 0.0));

	gl.bindBuffer(gl.ARRAY_BUFFER, uv_buf);
	gl.bufferData(gl.ARRAY_BUFFER, uv_f32, gl.STATIC_DRAW);
	gl.vertexAttribPointer(uvAttr, 2, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, vert_buf);
	gl.bufferData(gl.ARRAY_BUFFER, vert_f32, gl.STATIC_DRAW);
	gl.vertexAttribPointer(posAttr, 3, gl.FLOAT, false, 0, 0);

	// FAN because this vertex set was set up for QUADS, but that doesn't exist anymore,
	// but FAN takes points in the same order for a quad.
	gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
};

// textures is an array of the raw textures; 0 is bark, 1 is foliage.
Tree.Setup = function(gl, textures) {
	var fb = gl.createFramebuffer(), fb_vshader = getShader(gl, 'texture-vshader'),
	    fb_fshader = getShader(gl, 'texture-fshader'), prog = gl.createProgram(),
	    moisture = 0.5, temperature = 0.5,
	    leaf_color = vec4.create(), bark_color = vec4.create(),
	    wet_grass = vec4.fromValues(0.15, 0.4+0.3, 0.15, 1.0),
	    dry_grass = vec4.fromValues(0.7 + 0.15, 0.5 + 0.25, 0.15, 1.0),
	    dead_grass = vec4.fromValues(0.7, 0.6, 0.5, 1.0),
	    warm_grass = vec4.create(),
	    cold_grass = vec4.fromValues(0.5 + 0.1, 0.8 + 0.1, 0.7 + 0.1, 1.0),
	    dry_dirt = vec4.create(), wet_dirt = vec4.create(), cold_dirt = vec4.create(),
	    warm_dirt = vec4.create();
	const TEMP_COLD = 0.45;

	vec4.lerp(warm_grass, dry_grass, wet_grass, moisture);

	if (temperature < TEMP_COLD) {
		vec4.lerp(leaf_color, cold_grass, warm_grass, temperature / TEMP_COLD);
	} else {
		vec4.copy(leaf_color, warm_grass);
	}

	dry_dirt[0] = 0.4 + 0.3;  // 0.4+randf*0.6
	dry_dirt[1] = 0.1 + 0.25;  // 0.1+randf*0.5
	dry_dirt[2] = 0.2 + 0.2;  // 0.2+randf*0.2
	if (dry_dirt[2] < dry_dirt[1]) dry_dirt[2] = dry_dirt[1];

	// fade = randf*0.6;
	wet_dirt[0] = 0.2 + 0.3;
	wet_dirt[1] = 0.1 + 0.3;
	wet_dirt[1] += 0.05;  // randf*0.1
	wet_dirt[2] = 0.0 + 0.15;

	vec4.lerp(cold_dirt, wet_dirt, vec4.fromValues(0.7, 0.7, 0.7, 0.0), moisture);
	vec4.lerp(warm_dirt, dry_dirt, wet_dirt, moisture);
	vec4.lerp(bark_color, cold_dirt, warm_dirt, temperature);
	vec4.scale(bark_color, bark_color, 0.5);
	bark_color[3] = 1.0;

	gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

	gl.attachShader(prog, fb_vshader);
	gl.attachShader(prog, fb_fshader);
	gl.linkProgram(prog);

	if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
		alert('Link of fb shader failed: ' + gl.getProgramInfoLog(prog));
		return;
	}

	var old_shader = gl.getParameter(gl.CURRENT_PROGRAM);
	gl.useProgram(prog);

	var posAttr = gl.getAttribLocation(prog, 'pos'),
	    colorAttr = gl.getAttribLocation(prog, 'color'),
	    uvAttr = gl.getAttribLocation(prog, 'uv'),
	    projAttr = gl.getUniformLocation(prog, 'proj'),
	    texAttr = gl.getUniformLocation(prog, 'tex'),
	    proj = mat4.create();
	[posAttr, colorAttr, uvAttr].foreach(function(attr) {gl.enableVertexAttribArray(attr);});

	mat4.ortho(proj, 0, TEXTURE_SIZE, 0, TEXTURE_SIZE, 0.1, 2048);
	gl.uniformMatrix4fv(projAttr, false, proj);

	var old_tex = gl.getParameter(gl.TEXTURE_BINDING_2D),
	    old_active_tex = gl.getParameter(gl.ACTIVE_TEXTURE),
	    new_tex = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, new_tex);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TEXTURE_SIZE*4, TEXTURE_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, new_tex, 0);
	var vp = gl.getParameter(gl.VIEWPORT), color = gl.getParameter(gl.COLOR_CLEAR_VALUE);
	gl.viewport(0, 0, TEXTURE_SIZE*4, TEXTURE_SIZE);
	gl.clearColor(0.0, 0.0, 0.0, 0.0);
	gl.clear(gl.COLOR_BUFFER_BIT);

	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, textures[0]);
	gl.uniform1i(texAttr, 1);
	gl.viewport(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
	Tree.drawBarkTexture_(gl, posAttr, colorAttr, uvAttr, texAttr, textures[0], bark_color);
	gl.bindTexture(gl.TEXTURE_2D, textures[1]);
	gl.uniform1i(texAttr, 1);
	gl.viewport(TEXTURE_SIZE, 0, TEXTURE_SIZE, TEXTURE_SIZE);
	Tree.drawLeafTexture_(gl, posAttr, colorAttr, uvAttr, texAttr, textures[1], leaf_color);
	gl.bindTexture(gl.TEXTURE_2D, textures[2]);
	gl.uniform1i(texAttr, 1);
	gl.viewport(TEXTURE_SIZE*2, 0, TEXTURE_SIZE, TEXTURE_SIZE);
	Tree.drawVineTexture_(gl, posAttr, colorAttr, uvAttr, texAttr, textures[2], leaf_color);

	// copy back out to 'texture' canvas, to see what's going on
	{
		var tex_canvas = document.getElementById('texture');
		tex_canvas.width = TEXTURE_SIZE*4;
		tex_canvas.height = TEXTURE_SIZE;
		var ctx = tex_canvas.getContext('2d');
		var imgdata = ctx.getImageData(0, 0, TEXTURE_SIZE*4, TEXTURE_SIZE);
		var data = new Uint8Array(TEXTURE_SIZE*4 * TEXTURE_SIZE * 4);
		gl.readPixels(0, 0, TEXTURE_SIZE*4, TEXTURE_SIZE, gl.RGBA, gl.UNSIGNED_BYTE, data);
		for (var i=0; i<TEXTURE_SIZE*4 * TEXTURE_SIZE * 4; i++) {
			imgdata.data[i] = data[i];
		}
		ctx.putImageData(imgdata, 0, 0);
	}

	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.deleteFramebuffer(fb);

	// restore state
	gl.clearColor(color[0], color[1], color[2], color[3]);
	gl.viewport(vp[0], vp[1], vp[2], vp[3]);
	gl.activeTexture(old_active_tex);
	gl.bindTexture(gl.TEXTURE_2D, old_tex);
	gl.useProgram(old_shader);

	Tree.texture = new_tex;
};

// Add vertices for this tree to the vertices list (each item is a list of vert,
// norm, uv vectors, plus a model matrix), and indices list (each item is a
// uint16 index into the vertices list) for rendering as gl.TRIANGLES
Tree.prototype.Build = function(vertices, indices) {
	var _default_height = 8 + 4, // + randf*4 + randf*4
	    _default_branches = 2, // 2 + rand % 2
	    _default_lowest_branch = 3.0 / _default_height,
	    _default_base_radius = 0.2 + (_default_height / 20) * 0.5, // randf

	    _current_height = _default_height, // * (0.5f + randf)
	    _current_branches = _default_branches + 2, // + rand % 3
	    _current_lowest_branch = _default_lowest_branch + 0.1, // randf*0.2
	    _current_base_radius = _default_base_radius + 1, // rand%3

	    _branch_reach = 1.25,  // 1 + randf*0.5
	    _branch_lift = 1.5,  // 1 + randf

	    _current_angle_offset = Math.PI,  // randf*2*PI

	    branch_spacing = (0.95 - _current_lowest_branch) / _current_branches,
	    branches = [],
	    vert, norm, uv,
	    base_index = vertices.length,
	    foliage_height,
	    model = mat4.clone(this.model_);

	for (var i=0; i<_current_branches; i++) {
		var vertical_pos = _current_lowest_branch + i*branch_spacing;
		branch = {};
		branch.root = this.trunkPos_(vertical_pos, _current_base_radius, _current_height);
		branch.length = (_current_height - branch.root[2]) * _branch_reach;
		if (_current_height/2 < branch.length) branch.length = _current_height/2;
		branch.lift = branch.length / 2;

		branches.push(branch);
	}

	const STEPS = 7.0;

	for (var i=-1; i<branches.length; i++) {
		var core;
		if (i<0) {
			core = this.trunkPos_(0, _current_base_radius, _current_height);
			// widen
			core[3] = core[3] * 1.5;
			// drop a bit
			core[2] = core[2] - 2;
		} else {
			core = branches[i].root;
		}

		for (var ring=0; ring<=STEPS; ring++) {
			var angle;
			if (ring === 0 || ring === STEPS) {
				angle = 0.0;
			} else {
				angle = ring * (2 * Math.PI/STEPS);
			}
			var x = Math.cos(angle), y = Math.sin(angle);
			vert = vec4.create();
			vec4.add(vert, core, vec4.fromValues(x*core[3], y*core[3], 0.0, 0.0));
			norm = vec3.fromValues(x, y, 0.0);
			uv = vec2.fromValues((ring/STEPS)*0.249, core.z);
			vertices.push(new Vertex(vert, norm, uv, model));
		}
	}

	// tip vertex
	vert = this.trunkPos_(1.0, _current_base_radius, _current_height);
	vert[3] = 0.0;
	norm = vec3.fromValues(0.0, 0.0, 1.0);
	uv = vec2.fromValues(0.0, 0.0);
	var last_vert = new Vertex(vert, norm, uv, model);
	vertices.push(last_vert);

	var pushTri = function(index1, index2, index3) {
		indices.push(index1);
		indices.push(index2);
		indices.push(index3);
	}, pushQuad = function(index1, index2, index3, index4) {
		pushTri(index1, index2, index3);
		pushTri(index1, index3, index4);
	};

	for (var segment=0; segment<branches.length; segment++) {
		for (var ring=0; ring<STEPS; ring++) {
			pushQuad(
				base_index + (ring+0) + (segment+0)*(STEPS+1),
				base_index + (ring+1) + (segment+0)*(STEPS+1),
				base_index + (ring+1) + (segment+1)*(STEPS+1),
				base_index + (ring+0) + (segment+1)*(STEPS+1)
			);
		}
	}

	for (var ring=0; ring<STEPS; ring++) {
		pushTri(
			base_index + (ring+1) + (branches.length)*(STEPS+1),
			vertices.length - 1,
			base_index + (ring+0) + (branches.length)*(STEPS+1)
		);
	}

	if (this.tree_type_ == TreeType.CANOPY) {
		foliage_height = _current_height;
	} else {
		foliage_height = _current_height / 2;
	}

	this.makeFoliage_(vertices, pushTri, pushQuad, last_vert.vertex, foliage_height, 0.0, model);

	for (var i=0; i<branches.length; i++) {
		if (this.tree_type_ == TreeType.EVERGREEN) {
			// just rings of foliage, no actual branches
			var angle = i * (2*Math.PI / branches.length);
			this.makeFoliage_(vertices, pushTri, pushQuad,
					branches[i].root, branches[i].length, angle, model);
		} else {
			var angle = _current_angle_offset + i * ((2*Math.PI / branches.length) + Math.PI);
			this.makeBranch_(vertices, pushTri, pushQuad, branches[i], angle, _branch_lift, model);
		}
	}
};
