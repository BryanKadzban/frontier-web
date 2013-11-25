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

function Tree(tree_type, foliage_type, funnel, trunk_type) {
	this.tree_type_ = tree_type;
	this.foliage_type_ = foliage_type;
	this.funnel_ = funnel;
	this.trunk_type_ = trunk_type;
	this.bend_freq_ = 1.0 + (Math.random()*2) + Math.random();
}

const SEGMENTS_PER_METER = 0.25;
const MIN_RADIUS = 0.3;

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
Tree.prototype.makeFoliage_ = function(vertices, pushTri, pushQuad, pos_list, fsize, angle) {
	var uvTL = vec2.fromValues(0.25, 0.0),
	    uvTR = vec2.fromValues(0.5, 0.0),
	    uvBR = vec2.fromValues(0.5, 1.0),
	    uvBL = vec2.fromValues(0.25, 1.0),
	    base_index = vertices.length,
	    vert, norm, uv = vec2.create(),
	    tip_height = fsize / 4.0;

	// don't let foliage touch the ground
	if (fsize < (pos_list.vertex[2] - 2.0)) {
		fsize = (pos_list.vertex[2] - 2.0);
	}
	if (fsize < 0.1) {
		return;
	}

	switch(this.foliage_type_) {
		case FoliageType.PANEL:
			norm = vec3.fromValues(0.0, 0.0, 1.0);

			vert = vec4.fromValues(0.0,  -fsize, -fsize, 0.0);
			vertices.push(new Vertex(vert, norm, uvTL));

			vert = vec4.fromValues(-1.0,  fsize, -fsize, 0.0);
			vertices.push(new Vertex(vert, norm, uvTR));

			vert = vec4.fromValues(-1.0,  fsize,  fsize, 0.0);
			vertices.push(new Vertex(vert, norm, uvBR));

			vert = vec4.fromValues(0.0,  -fsize,  fsize, 0.0);
			vertices.push(new Vertex(vert, norm, uvBL));

			vert = vec4.fromValues(0.0,  -fsize, -fsize, 0.0);
			vertices.push(new Vertex(vert, norm, uvTR));

			vert = vec4.fromValues(1.0,   fsize, -fsize, 0.0);
			vertices.push(new Vertex(vert, norm, uvBR));

			vert = vec4.fromValues(1.0,   fsize,  fsize, 0.0);
			vertices.push(new Vertex(vert, norm, uvBL));

			vert = vec4.fromValues(0.0,  -fsize,  fsize, 0.0);
			vertices.push(new Vertex(vert, norm, uvTL));

			pushQuad(base_index + 0, base_index + 1, base_index + 2, base_index + 3);
			pushQuad(base_index + 7, base_index + 6, base_index + 5, base_index + 4);

			break;
		case FoliageType.SHIELD:
			norm = vec3.fromValues(0.0, 0.0, 1.0);

			vert = vec4.fromValues(fsize / 2, 0.0,  0.0, 0.0);
			vec2.lerp(uv, uvTL, uvBR, 0.5);
			vertices.push(new Vertex(vert, norm, uv));

			vert = vec4.fromValues(0.0, -fsize, 0.0, 0.0);
			vertices.push(new Vertex(vert, norm, uvTL));

			vert = vec4.fromValues(0.0,  0.0,  fsize, 0.0);
			vertices.push(new Vertex(vert, norm, uvTR));

			vert = vec4.fromValues(0.0,  fsize, 0.0, 0.0);
			vertices.push(new Vertex(vert, norm, uvBR));

			vert = vec4.fromValues(0.0,  0.0,  -fsize, 0.0);
			vertices.push(new Vertex(vert, norm, uvBL));

			// uv is still the lerp'ed value
			vert = vec4.fromValues(-fsize / 2, 0.0,  0.0, 0.0);
			vertices.push(new Vertex(vert, norm, uv));

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
			vertices.push(new Vertex(vert, norm, uv));

			// first ring
			vert = vec4.fromValues(-fsize / 2, -fsize / 2, level1, 0.0);
			vec2.lerp(uv_mid, uvTL, uvTR, 0.5);
			vertices.push(new Vertex(vert, norm, vec2.clone(uv_mid)));

			vert = vec4.fromValues( fsize / 2, -fsize / 2, level1, 0.0);
			vec2.lerp(uv_mid, uvTR, uvBR, 0.5);
			vertices.push(new Vertex(vert, norm, vec2.clone(uv_mid)));

			vert = vec4.fromValues( fsize / 2,  fsize / 2, level1, 0.0);
			vec2.lerp(uv_mid, uvBL, uvBR, 0.5);
			vertices.push(new Vertex(vert, norm, vec2.clone(uv_mid)));

			vert = vec4.fromValues(-fsize / 2,  fsize / 2, level1, 0.0);
			vec2.lerp(uv_mid, uvTL, uvBL, 0.5);
			vertices.push(new Vertex(vert, norm, vec2.clone(uv_mid)));

			// tips
			vert = vec4.fromValues(0.0, -fsize, level2, 0.0);
			vertices.push(new Vertex(vert, norm, uvTR));

			vert = vec4.fromValues(fsize,  0.0, level2, 0.0);
			vertices.push(new Vertex(vert, norm, uvBR));

			vert = vec4.fromValues(0.0,  fsize, level2, 0.0);
			vertices.push(new Vertex(vert, norm, uvBL));

			vert = vec4.fromValues(-fsize, 0.0, level2, 0.0);
			vertices.push(new Vertex(vert, norm, uvTL));

			// center, but lower
			vert = vec4.fromValues( 0.0, 0.0, level1 / 16, 0.0);
			vertices.push(new Vertex(vert, norm, uv));

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
			vertices.push(new Vertex(vert, norm, uv));

			vert = vec4.fromValues(-fsize, -fsize, -tip_height, 0.0);
			norm = vec3.fromValues(-0.5, -0.5, 0.0);
			vertices.push(new Vertex(vert, norm, uvTL));

			vert = vec4.fromValues(fsize, -fsize, -tip_height, 0.0);
			norm = vec3.fromValues( 0.5, -0.5, 0.0);
			vertices.push(new Vertex(vert, norm, uvTR));

			vert = vec4.fromValues(fsize, fsize, -tip_height, 0.0);
			norm = vec3.fromValues( 0.5, 0.5, 0.0);
			vertices.push(new Vertex(vert, norm, uvBR));

			vert = vec4.fromValues(-fsize, fsize, -tip_height, 0.0);
			norm = vec3.fromValues(-0.5, 0.5, 0.0);
			vertices.push(new Vertex(vert, norm, uvBL));

			vert = vec4.fromValues(0.0, 0.0, tip_height / 2, 0.0);
			norm = vec3.fromValues(0.0, 0.0, 1.0);
			vertices.push(new Vertex(vert, norm, uv));

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
			vertices.push(new Vertex(vert, norm, uv));

			vert = vec4.fromValues(-fsize, -fsize, -tip_height, 0.0);
			norm = vec3.fromValues(-0.5, -0.5, 0.0);
			vertices.push(new Vertex(vert, norm, uvTL));

			vert = vec4.fromValues(fsize, -fsize, -tip_height, 0.0);
			norm = vec3.fromValues(0.5, -0.5, 0.0);
			vertices.push(new Vertex(vert, norm, uvTR));

			vert = vec4.fromValues(fsize, fsize, -tip_height, 0.0);
			norm = vec3.fromValues(0.5, 0.5, 0.0);
			vertices.push(new Vertex(vert, norm, uvBR));

			vert = vec4.fromValues(-fsize, fsize, -tip_height, 0.0);
			norm = vec3.fromValues(-0.5, 0.5, 0.0);
			vertices.push(new Vertex(vert, norm, uvBL));

			vert = vec4.fromValues(0.0, 0.0, tip_height / 2, 0.0);
			norm = vec3.fromValues(0.0, 0.0, 1.0);
			// uv still has the previous lerp'ed value
			vertices.push(new Vertex(vert, norm, uv));

			pushTri(base_index, base_index + 2, base_index + 1);
			pushTri(base_index, base_index + 3, base_index + 2);
			pushTri(base_index, base_index + 4, base_index + 3);
			pushTri(base_index, base_index + 1, base_index + 4);

			break;
	}

	var angle_mat = mat4.create();
	mat4.rotateZ(angle_mat, angle_mat, angle);

	vertices.foreach(function(vertlist) {
		vec4.transformMat4(vertlist.vertex, vertlist.vertex, angle_mat);
		vec4.add(vertlist.vertex, vertlist.vertex, pos_list.vertex);
	}, base_index);
};

// Same for vines
Tree.prototype.makeVines_ = function(vertices, pushQuad, bottom_points) {
	var base_index = vertices.length,
	    vert, norm = vec3.fromValues(0.0, 0.0, 1.0), uv,
	    vert_2 = vec4.create();

	// if (!has_vines_) return;

	for (var segment = 0; segment < bottom_points.length; segment++) {
		vert = vec4.clone(bottom_points[segment]);
		vertices.push(new Vertex(vert, norm, vec2.fromValues(0.75, segment)));
		vec4.add(vert_2, vert, vec4.fromValues(0.0, 0.0, -3.5, 0.0));
		vertices.push(new Vertex(vec4.clone(vert_2), norm, vec2.fromValues(0.5, segment)));
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
Tree.prototype.makeBranch_ = function(vertices, pushTri, pushQuad, anchor, angle, _branch_lift) {
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
			vertices.push(new Vertex(vert, norm, vec2.fromValues(0.249, vert[1])));
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
				vertices.push(new Vertex(vert, norm, uv));
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
	var pos_list = vertices[vertices.length - 1];
	this.makeFoliage_(vertices, pushTri, pushQuad, pos_list, anchor.length * 0.56, angle);

	this.makeVines_(vertices, pushQuad, underside_vertices);
}

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
	    foliage_height;

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
			vertices.push(new Vertex(vert, norm, uv));
		}
	}

	// tip vertex
	vert = this.trunkPos_(1.0, _current_base_radius, _current_height);
	vert[3] = 0.0;
	norm = vec3.fromValues(0.0, 0.0, 1.0);
	uv = vec2.fromValues(0.0, 0.0);
	var last_vert = new Vertex(vert, norm, uv);
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

	this.makeFoliage_(vertices, pushTri, pushQuad, last_vert, foliage_height, 0.0);

	// TODO: EVERGREEN would not create branches; it would call makeFoliage_ a
	// couple more times instead

	for (var i=0; i<branches.length; i++) {
		var angle = _current_angle_offset + i * ((2*Math.PI / branches.length) + Math.PI);
		this.makeBranch_(vertices, pushTri, pushQuad, branches[i], angle, _branch_lift);
	}

	// This is a bit of a hack; all the "model" items weren't set above, so set
	// them all here.  This will have to change (likely by passing model around)
	// before the code will create multiple trees, but this works for now.
	vertices.foreach(function(vertex) {
			vertex.model = mat4.create();
			mat4.rotateX(vertex.model, vertex.model, -Math.PI / 2);
	});
};
