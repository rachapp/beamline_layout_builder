// Fallback template so the application never breaks even if all template CSV files are deleted
const FALLBACK_CSV = `# Fallback Beamline - Construction & Spatial Guide
# Total Beamline Length: 50 m | Components: 5
Sequence #,Component Name,Type,Center Position X (m),Optics Physical Length (m),Chamber Footprint Length (m),Upstream Face X_start (m),Downstream Face X_end (m),Asymmetric Chamber,Show Footprint Box,Show Footprint Text,Show Label,Locked,Lock Length,Lock Center,Major Color,Minor Color,Clearance to Next (m),Next Component,Elevation Y (mm),Lateral Offset Z (mm),Wall/Enclosure Width (m),Wall/Enclosure Height (m),Ray Color,Ray Width,Ray Style,Show Ray Arrow,Animate Ray,Misc A,Misc B,Misc C,Misc D,Label Side X (px),Label Side Y (px),Label Top X (px),Label Top Y (px),Enclosure / Section
1,"Source",SOURCE,0.000,2.000,2.000,-2.000,0.000,NO,NO,NO,YES,NO,NO,NO,"","",2.000,"Slit 1",0.0,0.0,,,"#ef4444",1.5,"solid",YES,YES,"Undulator","50","40","solid",,,,,"Open Beamline"
2,"Slit 1",SLIT,2.500,0.300,0.900,2.050,2.950,NO,NO,NO,YES,NO,NO,NO,"","",6.550,"DCM",0.0,0.0,,,"",,"",,,"","","","",,,,,"Open Beamline"
3,"DCM",VDCM,10.000,1.200,1.200,9.500,10.700,YES,NO,NO,YES,NO,NO,NO,"","",8.250,"Mirror",0.0,0.0,,,"",,"",,,"25","45","0.5","0.5",,,,,"Open Beamline"
4,"Mirror",VFM,20.000,1.500,2.100,18.950,21.050,NO,NO,NO,YES,NO,NO,NO,"","",9.000,"Detector",0.0,0.0,,,"",,"",,,"1.5","0","","0.3",,,,,"Open Beamline"
5,"Detector",DETECTOR,30.000,1.000,1.600,29.200,30.800,NO,NO,NO,YES,NO,NO,NO,"","",19.200,"End",30.0,0.0,,,"",,"",,,"Silicon Detector","NO","YES","",,,,,"Open Beamline"
`;

export const csvTemplates = {
  'Default Beamline': {
    fileName: 'Default Beamline.csv',
    displayName: 'Default Beamline',
    rawCsv: FALLBACK_CSV
  }
};

export default csvTemplates;
