import { TYPES, PX_PER_M } from '../../constants';
import { BufferedNumberInput } from '../BufferedNumberInput';

/** Height / width of a floating chamber. */
export const ChamberSizeField = ({ item: selectedItem, theme, updateItemProp }) => (
  <div>
    <label className="block text-[10px] font-bold uppercase mb-1 text-blue-500">Construction Height / Width (m)</label>
    <BufferedNumberInput
      step={0.1}
      value={selectedItem.height ?? (TYPES[selectedItem.type]?.height / PX_PER_M)}
      onChange={(val) => updateItemProp('height', isNaN(val) ? 0 : val)}
      className={`w-full text-xs font-bold border rounded-none p-1.5 outline-none ${theme.buttonBg} ${theme.text} border-blue-400`}
    />
    <p className="text-[9px] opacity-60 mt-1 italic leading-tight">* Height applies to Side View. Width applies to Top View.</p>
  </div>
);
