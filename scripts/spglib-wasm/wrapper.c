// WASM wrapper around spglib exposing a MoyoDataset-shaped JSON interface.
// SPDX-License-Identifier: BSD-3-Clause
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "spglib.h"

// ------------------------------------------------------------------
// Minimal growable string builder used to emit the dataset JSON.
// ------------------------------------------------------------------
typedef struct {
    char *buf;
    size_t len;
    size_t cap;
} sb;

static void sb_init(sb *s) {
    s->cap = 4096;
    s->len = 0;
    s->buf = (char *)malloc(s->cap);
    s->buf[0] = '\0';
}

static void sb_reserve(sb *s, size_t extra) {
    if (s->len + extra + 1 > s->cap) {
        size_t newcap = s->cap;
        while (newcap < s->len + extra + 1) newcap *= 2;
        s->buf = (char *)realloc(s->buf, newcap);
        s->cap = newcap;
    }
}

static void sb_append(sb *s, const char *str) {
    size_t n = strlen(str);
    sb_reserve(s, n);
    memcpy(s->buf + s->len, str, n);
    s->len += n;
    s->buf[s->len] = '\0';
}

static void sb_append_char(sb *s, char c) {
    sb_reserve(s, 1);
    s->buf[s->len++] = c;
    s->buf[s->len] = '\0';
}

static void sb_append_int(sb *s, long long v) {
    char tmp[32];
    snprintf(tmp, sizeof(tmp), "%lld", v);
    sb_append(s, tmp);
}

static void sb_append_double(sb *s, double v) {
    char tmp[64];
    snprintf(tmp, sizeof(tmp), "%.17g", v);
    sb_append(s, tmp);
}

static void sb_append_string(sb *s, const char *str) {
    sb_append_char(s, '"');
    for (const char *p = str; *p; p++) {
        switch (*p) {
            case '"': sb_append(s, "\\\""); break;
            case '\\': sb_append(s, "\\\\"); break;
            case '\n': sb_append(s, "\\n"); break;
            case '\r': sb_append(s, "\\r"); break;
            case '\t': sb_append(s, "\\t"); break;
            default:
                if ((unsigned char)*p < 0x20) {
                    char tmp[8];
                    snprintf(tmp, sizeof(tmp), "\\u%04x", (unsigned char)*p);
                    sb_append(s, tmp);
                } else {
                    sb_append_char(s, *p);
                }
        }
    }
    sb_append_char(s, '"');
}

// Emit a 3x3 matrix given in spglib's column-vector convention
// (m[cartesian][vector]) as a flat row-vector array (vector-major).
static void emit_lattice_3x3(sb *s, double m[3][3]) {
    for (int v = 0; v < 3; v++)
        for (int c = 0; c < 3; c++) {
            if (v || c) sb_append_char(s, ',');
            sb_append_double(s, m[c][v]);
        }
}

// Copy a row-vector lattice (vector-major, as used by the TS/Moyo API) into
// spglib's column-vector convention (lattice[cartesian][vector]).
static void to_spglib_lattice(double out[3][3], const double *rows) {
    for (int v = 0; v < 3; v++)
        for (int c = 0; c < 3; c++) out[c][v] = rows[v * 3 + c];
}

static void emit_cell(sb *s, double lattice[3][3], double positions[][3],
                      int *numbers, int n) {
    sb_append(s, "{\"lattice\":{\"basis\":[");
    emit_lattice_3x3(s, lattice);
    sb_append(s, "]},\"positions\":[");
    for (int i = 0; i < n; i++) {
        if (i) sb_append_char(s, ',');
        sb_append_char(s, '[');
        for (int c = 0; c < 3; c++) {
            if (c) sb_append_char(s, ',');
            sb_append_double(s, positions[i][c]);
        }
        sb_append_char(s, ']');
    }
    sb_append(s, "],\"numbers\":[");
    for (int i = 0; i < n; i++) {
        if (i) sb_append_char(s, ',');
        sb_append_int(s, numbers[i]);
    }
    sb_append(s, "]}");
}

// Emit the MoyoDataset-shaped JSON for a structure.
static void emit_dataset(sb *s, const SpglibDataset *ds, int n_std,
                         double prim_lattice[3][3], double prim_pos[][3],
                         int *prim_num, int n_prim, double symprec) {
    sb_append(s, "{\"number\":");
    sb_append_int(s, ds->spacegroup_number);
    sb_append(s, ",\"hall_number\":");
    sb_append_int(s, ds->hall_number);
    sb_append(s, ",\"hm_symbol\":");
    sb_append_string(s, ds->international_symbol);
    sb_append(s, ",\"operations\":[");
    for (int i = 0; i < ds->n_operations; i++) {
        if (i) sb_append_char(s, ',');
        sb_append(s, "{\"rotation\":[");
        for (int r = 0; r < 3; r++)
            for (int c = 0; c < 3; c++) {
                if (r || c) sb_append_char(s, ',');
                sb_append_int(s, ds->rotations[i][r][c]);
            }
        sb_append(s, "],\"translation\":[");
        for (int r = 0; r < 3; r++) {
            if (r) sb_append_char(s, ',');
            sb_append_double(s, ds->translations[i][r]);
        }
        sb_append(s, "]}");
    }
    sb_append(s, "],\"orbits\":[");
    for (int i = 0; i < ds->n_atoms; i++) {
        if (i) sb_append_char(s, ',');
        sb_append_int(s, ds->crystallographic_orbits[i]);
    }
    sb_append(s, "],\"wyckoffs\":[");
    for (int i = 0; i < n_std; i++) {
        if (i) sb_append_char(s, ',');
        char tmp[16];
        snprintf(tmp, sizeof(tmp), "%d", ds->wyckoffs[i]);
        sb_append_string(s, tmp);
    }
    sb_append(s, "],\"site_symmetry_symbols\":[");
    for (int i = 0; i < n_std; i++) {
        if (i) sb_append_char(s, ',');
        sb_append_string(s, ds->site_symmetry_symbols[i]);
    }
    sb_append(s, "],\"std_cell\":");
    emit_cell(s, ds->std_lattice, ds->std_positions, ds->std_types, n_std);
    sb_append(s, ",\"std_linear\":[");
    emit_lattice_3x3(s, ds->std_rotation_matrix);
    sb_append(s, "],\"std_origin_shift\":[");
    for (int i = 0; i < 3; i++) {
        if (i) sb_append_char(s, ',');
        sb_append_double(s, ds->origin_shift[i]);
    }
    sb_append(s, "],\"std_rotation_matrix\":[");
    emit_lattice_3x3(s, ds->std_rotation_matrix);
    sb_append(s, "],\"pearson_symbol\":\"\",\"prim_std_cell\":");
    emit_cell(s, prim_lattice, prim_pos, prim_num, n_prim);
    sb_append(s, ",\"prim_std_linear\":[1,0,0,0,1,0,0,0,1],\"prim_std_origin_shift\":[0,0,0],\"mapping_std_prim\":[");
    for (int i = 0; i < n_std; i++) {
        if (i) sb_append_char(s, ',');
        sb_append_int(s, ds->std_mapping_to_primitive[i]);
    }
    sb_append(s, "],\"symprec\":");
    sb_append_double(s, symprec);
    sb_append(s, ",\"angle_tolerance\":{\"type\":\"Default\"}}");
}

// Entry point: analyze a cell given as raw arrays, return a JSON string.
// The returned pointer must be freed with spglib_free_string.
char *spglib_analyze_cell(const double *lattice, const double *positions,
                          const int *numbers, int n_atoms, double symprec) {
    sb out;
    sb_init(&out);

    double lat[3][3];
    double(*pos)[3] = (double(*)[3])malloc(sizeof(double[3]) * (n_atoms > 0 ? n_atoms : 1));
    int *num = (int *)malloc(sizeof(int) * (n_atoms > 0 ? n_atoms : 1));
    double plat[3][3];
    double(*ppos)[3] = (double(*)[3])malloc(sizeof(double[3]) * (n_atoms > 0 ? n_atoms : 1));
    int *pnum = (int *)malloc(sizeof(int) * (n_atoms > 0 ? n_atoms : 1));
    if (!pos || !num || !ppos || !pnum) {
        sb_append(&out, "{\"number\":0}");
        free(pos); free(num); free(ppos); free(pnum);
        return out.buf;
    }

    to_spglib_lattice(lat, lattice);
    for (int i = 0; i < n_atoms; i++) {
        pos[i][0] = positions[3 * i];
        pos[i][1] = positions[3 * i + 1];
        pos[i][2] = positions[3 * i + 2];
        num[i] = numbers[i];
    }

    SpglibDataset *ds = spg_get_dataset(lat, pos, num, n_atoms, symprec);
    if (!ds || ds->spacegroup_number == 0) {
        if (ds) spg_free_dataset(ds);
        sb_append(&out, "{\"number\":0}");
        free(pos); free(num); free(ppos); free(pnum);
        return out.buf;
    }

    int n_std = ds->n_std_atoms;

    // Standardized primitive cell via spg_find_primitive (overwrites copies).
    int n_prim = 0;
    to_spglib_lattice(plat, lattice);
    for (int i = 0; i < n_atoms; i++) {
        ppos[i][0] = positions[3 * i];
        ppos[i][1] = positions[3 * i + 1];
        ppos[i][2] = positions[3 * i + 2];
        pnum[i] = numbers[i];
    }
    n_prim = spg_find_primitive(plat, ppos, pnum, n_atoms, symprec);
    if (n_prim <= 0) n_prim = 0;

    emit_dataset(&out, ds, n_std, plat, ppos, pnum, n_prim, symprec);

    spg_free_dataset(ds);
    free(pos); free(num); free(ppos); free(pnum);
    return out.buf;
}

void spglib_free_string(char *ptr) { free(ptr); }

// Niggli reduction of a 3x3 lattice given row-major; returns 1 on success.
// The input array is overwritten with the reduced lattice.
int spglib_niggli_reduce(double *lattice) {
    double lat[3][3];
    to_spglib_lattice(lat, lattice);
    int ok = spg_niggli_reduce(lat, 1e-5);
    for (int v = 0; v < 3; v++)
        for (int c = 0; c < 3; c++) lattice[v * 3 + c] = lat[c][v];
    return ok;
}
