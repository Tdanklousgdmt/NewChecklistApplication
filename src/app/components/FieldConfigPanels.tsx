import { useRef } from "react";
import { Plus, X, Trash2, Camera, Video, Image, Film, RefreshCw } from "lucide-react";
import { CanvasField } from "./ChecklistStep2";

interface FieldConfigPanelsProps {
  field: CanvasField;
  inputClass: string;
  onUpdateField: (uid: string, updates: Partial<CanvasField>) => void;
}

// ── Media Embed Creator Upload sub-component (needs hooks) ─────────
function MediaEmbedCreatorUpload({
  field,
  inputClass,
  onUpdateField,
}: {
  field: CanvasField;
  inputClass: string;
  onUpdateField: (uid: string, updates: Partial<CanvasField>) => void;
}) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "bmp"];
    const videoExts = ["mp4", "mov", "webm", "avi", "mkv", "m4v"];
    const isImage = file.type.startsWith("image/") || (!file.type && imageExts.includes(ext));
    const isVideo = file.type.startsWith("video/") || (!file.type && videoExts.includes(ext));
    if (!isImage && !isVideo) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      onUpdateField(field.uid, {
        embeddedMediaData: {
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl,
          mediaType: isImage ? "image" : "video",
        },
      });
    };
    reader.readAsDataURL(file);
  };

  const media = field.embeddedMediaData;

  return (
    <>
      {/* Reference Media Upload */}
      <div>
        <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">
          Reference Media <span className="normal-case text-violet-500">(shown to filler as example)</span>
        </label>

        {media ? (
          <div className="space-y-2">
            {/* Preview */}
            {media.mediaType === "image" ? (
              <div className="relative rounded-xl overflow-hidden border border-violet-200 bg-violet-50">
                <img
                  src={media.dataUrl}
                  alt={media.name}
                  className="w-full max-h-40 object-contain bg-white"
                />
                <div className="absolute top-2 right-2">
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-white/90 rounded-full text-[10px] text-violet-600 shadow-sm">
                    <Image className="w-3 h-3" /> Image
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-violet-200 bg-black">
                <video
                  src={media.dataUrl}
                  className="w-full max-h-40 object-contain"
                  controls
                />
                <div className="absolute top-2 right-2">
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-white/90 rounded-full text-[10px] text-violet-600 shadow-sm">
                    <Film className="w-3 h-3" /> Video
                  </span>
                </div>
              </div>
            )}

            {/* File info + actions */}
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] text-gray-500 truncate max-w-[140px]">
                {media.name} ({(media.size / 1024).toFixed(0)} KB)
              </span>
              <button
                type="button"
                onClick={() => onUpdateField(field.uid, { embeddedMediaData: undefined })}
                className="flex items-center gap-1 px-2 py-1 text-[10px] text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="w-3 h-3" /> Remove
              </button>
            </div>

            {/* Replace button */}
            <button
              type="button"
              onClick={() => {
                if (media.mediaType === "image") imageInputRef.current?.click();
                else videoInputRef.current?.click();
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-violet-200 rounded-lg text-[10px] text-violet-500 hover:border-violet-400 hover:bg-violet-50 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Replace media
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-violet-200 rounded-xl p-5 bg-violet-50/30">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center">
                <Image className="w-5 h-5 text-violet-400" />
              </div>
              <div className="w-px h-7 bg-violet-200" />
              <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center">
                <Film className="w-5 h-5 text-violet-400" />
              </div>
            </div>
            <p className="text-[10px] text-gray-500 text-center mb-3 leading-relaxed">
              Upload an image or video that fillers will see as a reference example
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 bg-violet-500 text-white rounded-lg text-[10px] font-semibold hover:bg-violet-600 transition-colors"
              >
                <Camera className="w-3 h-3" /> Upload Image
              </button>
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 bg-violet-100 text-violet-700 rounded-lg text-[10px] font-semibold hover:bg-violet-200 transition-colors"
              >
                <Video className="w-3 h-3" /> Upload Video
              </button>
            </div>
          </div>
        )}

        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) processFile(f);
            e.target.value = "";
          }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) processFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {/* Size limits removed — media_embed is display-only for fillers */}
    </>
  );
}

export function FieldConfigPanels({ field, inputClass, onUpdateField }: FieldConfigPanelsProps) {
  return (
    <>
      {/* Number + Unit Configuration */}
      {field.typeId === "number_unit" && (
        <>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Primary Unit</label>
            <input
              type="text"
              value={field.primaryUnit || ""}
              onChange={(e) => onUpdateField(field.uid, { primaryUnit: e.target.value })}
              placeholder="e.g., kg, meters, °C"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Sub-unit (Optional)</label>
            <input
              type="text"
              value={field.subUnit || ""}
              onChange={(e) => onUpdateField(field.uid, { subUnit: e.target.value })}
              placeholder="e.g., grams, cm"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Precision (Decimals)</label>
            <input
              type="number"
              value={field.precision ?? 2}
              onChange={(e) => onUpdateField(field.uid, { precision: Number(e.target.value) || 0 })}
              min="0"
              max="10"
              className={inputClass}
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id={`conversion-${field.uid}`}
              checked={field.enableConversion ?? false}
              onChange={(e) => onUpdateField(field.uid, { enableConversion: e.target.checked })}
              className="w-4 h-4 text-[#2abaad] border-gray-300 rounded focus:ring-[#2abaad]"
            />
            <label htmlFor={`conversion-${field.uid}`} className="text-xs text-gray-600 cursor-pointer">
              Enable unit conversion
            </label>
          </div>
        </>
      )}

      {/* Number with Thresholds Configuration */}
      {field.typeId === "number_threshold" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Min Value</label>
              <input
                type="number"
                value={field.minValue ?? ""}
                onChange={(e) => onUpdateField(field.uid, { minValue: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Min"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Max Value</label>
              <input
                type="number"
                value={field.maxValue ?? ""}
                onChange={(e) => onUpdateField(field.uid, { maxValue: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Max"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Thresholds</label>
            <div className="flex flex-col gap-2">
              {(field.thresholds || []).map((threshold, idx) => (
                <div key={threshold.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <select
                    value={threshold.operator}
                    onChange={(e) => {
                      const newThresholds = [...(field.thresholds || [])];
                      newThresholds[idx] = { ...threshold, operator: e.target.value as any };
                      onUpdateField(field.uid, { thresholds: newThresholds });
                    }}
                    className="px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                  >
                    <option value="<">&lt;</option>
                    <option value="<=">&lt;=</option>
                    <option value="=">=</option>
                    <option value=">=">&gt;=</option>
                    <option value=">">&gt;</option>
                  </select>
                  <input
                    type="number"
                    value={threshold.value}
                    onChange={(e) => {
                      const newThresholds = [...(field.thresholds || [])];
                      newThresholds[idx] = { ...threshold, value: Number(e.target.value) };
                      onUpdateField(field.uid, { thresholds: newThresholds });
                    }}
                    placeholder="Value"
                    className="flex-1 px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                  />
                  <select
                    value={threshold.color}
                    onChange={(e) => {
                      const newThresholds = [...(field.thresholds || [])];
                      newThresholds[idx] = { ...threshold, color: e.target.value as any };
                      onUpdateField(field.uid, { thresholds: newThresholds });
                    }}
                    className="px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                  >
                    <option value="green">🟢 Green</option>
                    <option value="yellow">🟡 Yellow</option>
                    <option value="red">🔴 Red</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const newThresholds = [...(field.thresholds || [])];
                      newThresholds.splice(idx, 1);
                      onUpdateField(field.uid, { thresholds: newThresholds });
                    }}
                    className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const newThreshold = {
                    id: `threshold_${Date.now()}`,
                    operator: ">=" as const,
                    value: 0,
                    color: "green" as const,
                  };
                  onUpdateField(field.uid, { thresholds: [...(field.thresholds || []), newThreshold] });
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-gray-200 rounded-lg text-[10px] text-gray-400 hover:border-[#2abaad] hover:text-[#2abaad] transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Threshold
              </button>
            </div>
          </div>
        </>
      )}

      {/* Custom Buttons Configuration */}
      {field.typeId === "custom_buttons" && (
        <div>
          <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Custom Buttons</label>
          <div className="flex flex-col gap-2">
            {(field.customButtons || []).map((btn, idx) => (
              <div key={btn.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex flex-col gap-2">
                  {/* Button Label */}
                  <input
                    type="text"
                    value={btn.label}
                    onChange={(e) => {
                      const newButtons = [...(field.customButtons || [])];
                      newButtons[idx] = { ...btn, label: e.target.value };
                      onUpdateField(field.uid, { customButtons: newButtons });
                    }}
                    placeholder="Button label"
                    className="px-2 py-1.5 bg-white border border-gray-200 rounded text-xs"
                  />
                  
                  {/* Color Pickers */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] text-gray-400 mb-1">BG Color</label>
                      <input
                        type="color"
                        value={btn.bgColor}
                        onChange={(e) => {
                          const newButtons = [...(field.customButtons || [])];
                          newButtons[idx] = { ...btn, bgColor: e.target.value };
                          onUpdateField(field.uid, { customButtons: newButtons });
                        }}
                        className="w-full h-8 rounded border border-gray-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-gray-400 mb-1">Text Color</label>
                      <input
                        type="color"
                        value={btn.textColor}
                        onChange={(e) => {
                          const newButtons = [...(field.customButtons || [])];
                          newButtons[idx] = { ...btn, textColor: e.target.value };
                          onUpdateField(field.uid, { customButtons: newButtons });
                        }}
                        className="w-full h-8 rounded border border-gray-200"
                      />
                    </div>
                  </div>

                  {/* Score */}
                  <div>
                    <label className="block text-[9px] text-gray-400 mb-1">Score</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={typeof btn.score === "number" ? btn.score : ""}
                        onChange={(e) => {
                          const newButtons = [...(field.customButtons || [])];
                          newButtons[idx] = { ...btn, score: e.target.value ? Number(e.target.value) : undefined };
                          onUpdateField(field.uid, { customButtons: newButtons });
                        }}
                        placeholder="Points"
                        className="flex-1 px-2 py-1.5 bg-white border border-gray-200 rounded text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newButtons = [...(field.customButtons || [])];
                          newButtons[idx] = { ...btn, score: btn.score === "N/A" ? undefined : "N/A" };
                          onUpdateField(field.uid, { customButtons: newButtons });
                        }}
                        className={`px-3 py-1.5 rounded text-[10px] ${btn.score === "N/A" ? "bg-gray-600 text-white" : "bg-white border border-gray-200 text-gray-500"}`}
                      >
                        N/A
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newButtons = [...(field.customButtons || [])];
                          newButtons[idx] = { ...btn, score: btn.score === "reveal" ? undefined : "reveal" };
                          onUpdateField(field.uid, { customButtons: newButtons });
                        }}
                        className={`px-3 py-1.5 rounded text-[10px] ${btn.score === "reveal" ? "bg-purple-500 text-white" : "bg-white border border-gray-200 text-gray-500"}`}
                      >
                        Reveal
                      </button>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 flex-1">
                      <input
                        type="checkbox"
                        checked={btn.isDefault ?? false}
                        onChange={(e) => {
                          const newButtons = (field.customButtons || []).map((b, i) => ({
                            ...b,
                            isDefault: i === idx ? e.target.checked : false
                          }));
                          onUpdateField(field.uid, { customButtons: newButtons });
                        }}
                        className="w-3 h-3 text-[#2abaad] border-gray-300 rounded"
                      />
                      <span className="text-[10px] text-gray-600">Default</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newButtons = [...(field.customButtons || [])];
                        newButtons.splice(idx, 1);
                        onUpdateField(field.uid, { customButtons: newButtons });
                      }}
                      className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Preview */}
                  <div 
                    className="px-3 py-2 rounded-lg text-xs text-center font-medium"
                    style={{ backgroundColor: btn.bgColor, color: btn.textColor }}
                  >
                    {btn.label || "Button Preview"}
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const newButton = {
                  id: `btn_${Date.now()}`,
                  label: `Option ${(field.customButtons || []).length + 1}`,
                  bgColor: "#2abaad",
                  textColor: "#ffffff",
                  score: 10,
                };
                onUpdateField(field.uid, { customButtons: [...(field.customButtons || []), newButton] });
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-gray-200 rounded-lg text-[10px] text-gray-400 hover:border-[#2abaad] hover:text-[#2abaad] transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add Button
            </button>
          </div>
        </div>
      )}

      {/* Dropdown Multi-Select and Other Options */}
      {field.typeId === "dropdown" && (
        <>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id={`multi-${field.uid}`}
              checked={field.multiSelect ?? false}
              onChange={(e) => onUpdateField(field.uid, { multiSelect: e.target.checked })}
              className="w-4 h-4 text-[#2abaad] border-gray-300 rounded focus:ring-[#2abaad]"
            />
            <label htmlFor={`multi-${field.uid}`} className="text-xs text-gray-600 cursor-pointer">
              Allow multiple selection
            </label>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id={`other-${field.uid}`}
              checked={field.allowOther ?? false}
              onChange={(e) => onUpdateField(field.uid, { allowOther: e.target.checked })}
              className="w-4 h-4 text-[#2abaad] border-gray-300 rounded focus:ring-[#2abaad]"
            />
            <label htmlFor={`other-${field.uid}`} className="text-xs text-gray-600 cursor-pointer">
              Allow "Other" with text input
            </label>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id={`searchable-${field.uid}`}
              checked={field.searchable ?? false}
              onChange={(e) => onUpdateField(field.uid, { searchable: e.target.checked })}
              className="w-4 h-4 text-[#2abaad] border-gray-300 rounded focus:ring-[#2abaad]"
            />
            <label htmlFor={`searchable-${field.uid}`} className="text-xs text-gray-600 cursor-pointer">
              Enable search
            </label>
          </div>
        </>
      )}

      {/* Date/Time Constraints */}
      {(field.typeId === "date" || field.typeId === "datetime") && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Min Date</label>
              <input
                type="date"
                value={field.minDate || ""}
                onChange={(e) => onUpdateField(field.uid, { minDate: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Max Date</label>
              <input
                type="date"
                value={field.maxDate || ""}
                onChange={(e) => onUpdateField(field.uid, { maxDate: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
        </>
      )}

      {/* Time Constraints */}
      {(field.typeId === "time" || field.typeId === "datetime") && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Min Time</label>
              <input
                type="time"
                value={field.minTime || ""}
                onChange={(e) => onUpdateField(field.uid, { minTime: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Max Time</label>
              <input
                type="time"
                value={field.maxTime || ""}
                onChange={(e) => onUpdateField(field.uid, { maxTime: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
        </>
      )}

      {/* Media Embed Settings (SCRUM-2) */}
      {field.typeId === "media_embed" && (
        <MediaEmbedCreatorUpload field={field} inputClass={inputClass} onUpdateField={onUpdateField} />
      )}

      {/* Media File Settings */}
      {(field.typeId === "photo" || field.typeId === "file" || field.typeId === "video") && (
        <>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Max File Size (MB)</label>
            <input
              type="number"
              value={field.maxFileSize ?? 10}
              onChange={(e) => onUpdateField(field.uid, { maxFileSize: Number(e.target.value) || 10 })}
              min="1"
              max="100"
              className={inputClass}
            />
          </div>
          {field.typeId === "photo" && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id={`compress-${field.uid}`}
                checked={field.compressImage ?? true}
                onChange={(e) => onUpdateField(field.uid, { compressImage: e.target.checked })}
                className="w-4 h-4 text-[#2abaad] border-gray-300 rounded focus:ring-[#2abaad]"
              />
              <label htmlFor={`compress-${field.uid}`} className="text-xs text-gray-600 cursor-pointer">
                Compress images
              </label>
            </div>
          )}
        </>
      )}

      {/* Signature Settings */}
      {field.typeId === "signature" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            id={`sign-before-${field.uid}`}
            checked={field.signBeforeSubmit ?? false}
            onChange={(e) => onUpdateField(field.uid, { signBeforeSubmit: e.target.checked })}
            className="w-4 h-4 text-[#2abaad] border-gray-300 rounded focus:ring-[#2abaad]"
          />
          <label htmlFor={`sign-before-${field.uid}`} className="text-xs text-gray-600 cursor-pointer">
            Require signature before submit
          </label>
        </div>
      )}

      {/* Instruction Markdown */}
      {field.typeId === "instruction" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            id={`markdown-${field.uid}`}
            checked={field.markdown ?? false}
            onChange={(e) => onUpdateField(field.uid, { markdown: e.target.checked })}
            className="w-4 h-4 text-[#2abaad] border-gray-300 rounded focus:ring-[#2abaad]"
          />
          <label htmlFor={`markdown-${field.uid}`} className="text-xs text-gray-600 cursor-pointer">
            Enable Markdown formatting
          </label>
        </div>
      )}

      {/* Numeric Formatting */}
      {(field.typeId === "number" || field.typeId === "number_unit" || field.typeId === "number_threshold") && (
        <>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id={`strict-${field.uid}`}
              checked={field.strictNumeric ?? false}
              onChange={(e) => onUpdateField(field.uid, { strictNumeric: e.target.checked })}
              className="w-4 h-4 text-[#2abaad] border-gray-300 rounded focus:ring-[#2abaad]"
            />
            <label htmlFor={`strict-${field.uid}`} className="text-xs text-gray-600 cursor-pointer">
              Strict numeric (no e/E notation)
            </label>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Locale Format</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateField(field.uid, { localeFormat: "en" })}
                className={`px-3 py-2 rounded-lg text-xs transition-all ${
                  (field.localeFormat || "en") === "en"
                    ? "bg-[#2abaad] text-white"
                    : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-[#2abaad]"
                }`}
              >
                EN (1234.56)
              </button>
              <button
                type="button"
                onClick={() => onUpdateField(field.uid, { localeFormat: "fr" })}
                className={`px-3 py-2 rounded-lg text-xs transition-all ${
                  field.localeFormat === "fr"
                    ? "bg-[#2abaad] text-white"
                    : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-[#2abaad]"
                }`}
              >
                FR (1234,56)
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}