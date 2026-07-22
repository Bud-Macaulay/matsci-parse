export const rockSaltCif = `
data_NaCl
_symmetry_space_group_name_H-M   'F m -3 m'
_cell_length_a   5.6402
_cell_length_b   5.6402
_cell_length_c   5.6402
_cell_angle_alpha   90
_cell_angle_beta    90
_cell_angle_gamma   90

loop_
  _atom_site_label
  _atom_site_type_symbol
  _atom_site_fract_x
  _atom_site_fract_y
  _atom_site_fract_z
Na1 Na 0 0 0
Cl1 Cl 0.5 0.5 0.5
`;

export const diamondCif = `
data_C
_symmetry_space_group_name_H-M   'F d -3 m'
_cell_length_a   3.567
_cell_length_b   3.567
_cell_length_c   3.567
_cell_angle_alpha   90
_cell_angle_beta    90
_cell_angle_gamma   90

loop_
  _atom_site_label
  _atom_site_type_symbol
  _atom_site_fract_x
  _atom_site_fract_y
  _atom_site_fract_z
C1 C 0 0 0
C2 C 0.25 0.25 0.25
`;

export const singleAtomCif = `
data_Si
_symmetry_space_group_name_H-M   'P 1'
_cell_length_a   5.431
_cell_length_b   5.431
_cell_length_c   5.431
_cell_angle_alpha   90
_cell_angle_beta    90
_cell_angle_gamma   90

loop_
  _atom_site_label
  _atom_site_type_symbol
  _atom_site_fract_x
  _atom_site_fract_y
  _atom_site_fract_z
Si1 Si 0 0 0
`;

export const multiLoopCif = `
##########################################################################
#               Crystallographic Information Format file
#               Produced by PyCifRW module
#
#  This is a CIF file.  CIF has been adopted by the International
#  Union of Crystallography as the standard for data archiving and
#  transmission.
#
#  For information on this file format, follow the CIF links at
#  http://www.iucr.org
##########################################################################

data_0

loop_
  _atom_site_label
  _atom_site_fract_x
  _atom_site_fract_y
  _atom_site_fract_z
  _atom_site_type_symbol
         Fe1       6.341503861687785e-38         0.0       0.0       Fe        
         Co1       0.7500000000090271  0.7500000000090271  0.750000000008991   Co       
         Co2       0.2500000000090452  0.2500000000090091  0.250000000009009   Co       
         Si1       0.5       0.5       0.5       Si 
_cell_angle_alpha                       60.00000000000001
_cell_angle_beta                        60.00000000000001
_cell_angle_gamma                       60.00000000000001
_cell_length_a                          3.924418394577536
_cell_length_b                          3.924418394577536
_cell_length_c                          3.924418394577536
loop_
  _symmetry_equiv_pos_as_xyz
         'x, y, z' 
_symmetry_int_tables_number             1
_symmetry_space_group_name_H-M          'P 1'
`;

export const liCoO2Cif = `data_1550399
loop_1
_space_group_IT_number           166
_symmetry_Int_Tables_number      166
_symmetry_space_group_name_Hall  '-R 3 2"'
_symmetry_space_group_name_H-M   'R -3 m :H'
_cell_angle_alpha                90
_cell_angle_beta                 90
_cell_angle_gamma                120
_cell_formula_units_Z            3
_cell_length_a                   2.8503(6)
_cell_length_b                   2.8503(6)
_cell_length_c                   14.139(3)
_cell_volume                     99.48(4)
loop_
_symmetry_equiv_pos_as_xyz
x,y,z
-y,x-y,z
-x+y,-x,z
y,x,-z
-x,-x+y,-z
x-y,-y,-z
-x,-y,-z
y,-x+y,-z
x-y,x,-z
-y,-x,z
x,x-y,z
-x+y,y,z
x+2/3,y+1/3,z+1/3
-y+2/3,x-y+1/3,z+1/3
-x+y+2/3,-x+1/3,z+1/3
y+2/3,x+1/3,-z+1/3
-x+2/3,-x+y+1/3,-z+1/3
x-y+2/3,-y+1/3,-z+1/3
-x+2/3,-y+1/3,-z+1/3
y+2/3,-x+y+1/3,-z+1/3
x-y+2/3,x+1/3,-z+1/3
-y+2/3,-x+1/3,z+1/3
x+2/3,x-y+1/3,z+1/3
-x+y+2/3,y+1/3,z+1/3
x+1/3,y+2/3,z+2/3
-y+1/3,x-y+2/3,z+2/3
-x+y+1/3,-x+2/3,z+2/3
y+1/3,x+2/3,-z+2/3
-x+1/3,-x+y+2/3,-z+2/3
x-y+1/3,-y+2/3,-z+2/3
-x+1/3,-y+2/3,-z+2/3
y+1/3,-x+y+2/3,-z+2/3
x-y+1/3,x+2/3,-z+2/3
-y+1/3,-x+2/3,z+2/3
x+1/3,x-y+2/3,z+2/3
-x+y+1/3,y+2/3,z+2/3
loop_
_atom_site_label
_atom_site_occupancy
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
_atom_site_adp_type
_atom_site_U_iso_or_equiv
_atom_site_type_symbol
Li 1.72(6) 0 0 0.5 Uiso 0.050 Li
Co 1.0 0 0 0 Uiso 0.030 Co
O1 1.0 0 0 0.2570(7) Uiso 0.030 O`;

export const sgn2Cif = `data_2242624
_space_group_IT_number           2
_space_group_name_Hall           '-P 1'
_space_group_name_H-M_alt        'P -1'
_symmetry_space_group_name_Hall  '-P 1'
_symmetry_space_group_name_H-M   'P -1'
_cell_angle_alpha                105.22(4)
_cell_angle_beta                 110.60(4)
_cell_angle_gamma                91.39(3)
_cell_formula_units_Z            1
_cell_length_a                   2.4473(10)
_cell_length_b                   3.4688(14)
_cell_length_c                   3.5144(13)
_cell_measurement_reflns_used    68
_cell_measurement_temperature    293
_cell_measurement_theta_max      16.0560
_cell_measurement_theta_min      2.8210
_cell_volume                     26.72(2)
loop_
_space_group_symop_operation_xyz
'x, y, z'
'-x, -y, -z'
loop_
_atom_site_type_symbol
_atom_site_label
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
_atom_site_U_iso_or_equiv
_atom_site_adp_type
_atom_site_calc_flag
_atom_site_occupancy
Fe Fe 0.5000 0.0000 0.0000 0.0072(4) Uiso d 1
N N1 0.163(4) -0.346(4) -0.485(2) 0.0066(10) Uiso d 1
N N2 0.065(3) -0.309(4) -0.861(2) 0.0068(10) Uiso d 1`;

export const ionicSymbolCif = `
data_NiO_ionic
_symmetry_space_group_name_H-M   'F m -3 m'
_cell_length_a   4.1769
_cell_length_b   4.1769
_cell_length_c   4.1769
_cell_angle_alpha   90
_cell_angle_beta    90
_cell_angle_gamma   90

loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
Ni1 Ni2+ 0.0 0.0 0.0
O1 O2- 0.5 0.5 0.5
`;
