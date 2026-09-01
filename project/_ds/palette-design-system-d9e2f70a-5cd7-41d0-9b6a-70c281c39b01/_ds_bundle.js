/* @ds-bundle: {"format":4,"namespace":"PaletteDesignSystem_d9e2f7","components":[{"name":"Button","sourcePath":"components/buttons/Button.jsx"},{"name":"IconButton","sourcePath":"components/buttons/IconButton.jsx"},{"name":"Badge","sourcePath":"components/containers/Badge.jsx"},{"name":"Card","sourcePath":"components/containers/Card.jsx"},{"name":"Tag","sourcePath":"components/containers/Tag.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/buttons/Button.jsx":"834423ca19f1","components/buttons/IconButton.jsx":"35b127c5d0b1","components/containers/Badge.jsx":"d78d18bc0cd4","components/containers/Card.jsx":"85f6698b760f","components/containers/Tag.jsx":"7aebe2dc2964","components/feedback/Dialog.jsx":"baf269bc0b6f","components/feedback/Toast.jsx":"de4b4750d2b1","components/feedback/Tooltip.jsx":"54700f86f28a","components/forms/Checkbox.jsx":"d5bab25d4194","components/forms/Input.jsx":"4ba93934179b","components/forms/Radio.jsx":"59f30aa0531c","components/forms/Select.jsx":"62f023f71534","components/forms/Switch.jsx":"97c59a73f9c0","components/navigation/Tabs.jsx":"864f2229c040","ui_kits/palette-app/Collections.jsx":"663688b45698","ui_kits/palette-app/Home.jsx":"c10123a48245","ui_kits/palette-app/Shell.jsx":"b9d421abafa4","ui_kits/palette-app/Stream.jsx":"829329ceb1bb","ui_kits/palette-app/Vault.jsx":"53d470480ac9"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.PaletteDesignSystem_d9e2f7 = window.PaletteDesignSystem_d9e2f7 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/buttons/Button.jsx
try { (() => {
function Button({
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  children,
  onClick
}) {
  const pad = size === 'sm' ? '8px 16px' : size === 'lg' ? '14px 28px' : '11px 22px';
  const font = size === 'sm' ? 'var(--text-body-sm)' : 'var(--text-body-strong)';
  let bg, color, border;
  if (variant === 'primary') {
    bg = disabled ? 'var(--slate-dim)' : 'var(--accent)';
    color = 'var(--text-on-accent)';
    border = 'none';
  } else if (variant === 'secondary') {
    bg = 'transparent';
    color = 'var(--text-primary)';
    border = '1.5px solid var(--border-default)';
  } else {
    bg = 'transparent';
    color = 'var(--accent)';
    border = 'none';
  }
  return React.createElement('button', {
    disabled,
    onClick,
    style: {
      font,
      fontWeight: 600,
      padding: pad,
      background: bg,
      color,
      border,
      borderRadius: 'var(--radius-pebble-sm)',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.55 : 1,
      transition: 'transform var(--duration-fast),background var(--duration-fast)'
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = 'scale(0.97)';
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = 'scale(1)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = 'scale(1)';
    }
  }, icon, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/buttons/Button.jsx", error: String((e && e.message) || e) }); }

// components/buttons/IconButton.jsx
try { (() => {
function IconButton({
  icon,
  size = 40,
  active = false,
  label,
  onClick
}) {
  return React.createElement('button', {
    onClick,
    'aria-label': label,
    style: {
      width: size,
      height: size,
      borderRadius: 'var(--radius-pebble-sm)',
      background: active ? 'var(--accent-soft)' : 'var(--surface-raised)',
      border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border-soft)'),
      color: active ? 'var(--accent)' : 'var(--text-secondary)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      fontSize: size * 0.45,
      transition: 'background var(--duration-fast)'
    }
  }, icon);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/buttons/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/containers/Badge.jsx
try { (() => {
function Badge({
  children,
  tone = 'neutral'
}) {
  const map = {
    neutral: {
      bg: 'var(--surface-raised)',
      color: 'var(--text-secondary)',
      border: 'var(--border-soft)'
    },
    accent: {
      bg: 'var(--accent-soft)',
      color: 'var(--accent)',
      border: 'var(--accent)'
    },
    success: {
      bg: 'var(--state-success-bg)',
      color: 'var(--state-success)',
      border: 'var(--state-success)'
    }
  };
  const t = map[tone];
  return React.createElement('span', {
    style: {
      font: 'var(--text-mono-sm)',
      letterSpacing: 'var(--tracking-mono)',
      textTransform: 'uppercase',
      background: t.bg,
      color: t.color,
      border: '1px solid ' + t.border,
      borderRadius: 'var(--radius-full)',
      padding: '4px 10px',
      display: 'inline-block'
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/containers/Badge.jsx", error: String((e && e.message) || e) }); }

// components/containers/Card.jsx
try { (() => {
function Card({
  image,
  title,
  subtitle,
  badge,
  children
}) {
  return React.createElement('div', {
    style: {
      background: 'var(--surface-base)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-pebble-md)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-card)',
      fontFamily: 'var(--font-body)',
      display: 'flex',
      flexDirection: 'column'
    }
  }, image && React.createElement('div', {
    style: {
      position: 'relative'
    }
  }, React.createElement('img', {
    src: image,
    style: {
      width: '100%',
      height: 180,
      objectFit: 'cover',
      display: 'block'
    }
  }), badge && React.createElement('span', {
    style: {
      position: 'absolute',
      top: 10,
      left: 10,
      background: 'var(--obsidian)',
      color: 'var(--terracotta)',
      font: 'var(--text-mono-sm)',
      letterSpacing: 'var(--tracking-mono)',
      padding: '4px 10px',
      borderRadius: 'var(--radius-full)',
      border: '1px solid var(--mint)'
    }
  }, badge)), React.createElement('div', {
    style: {
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    }
  }, title && React.createElement('div', {
    style: {
      font: 'var(--text-heading-md)',
      fontFamily: 'var(--font-display)',
      color: 'var(--text-primary)'
    }
  }, title), subtitle && React.createElement('div', {
    style: {
      font: 'var(--text-body-sm)',
      color: 'var(--text-secondary)'
    }
  }, subtitle), children));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/containers/Card.jsx", error: String((e && e.message) || e) }); }

// components/containers/Tag.jsx
try { (() => {
function Tag({
  children,
  active = false,
  onClick
}) {
  return React.createElement('button', {
    onClick,
    style: {
      font: 'var(--text-body-sm)',
      fontWeight: 600,
      background: active ? 'var(--accent)' : 'transparent',
      color: active ? 'var(--text-on-accent)' : 'var(--text-secondary)',
      border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border-default)'),
      borderRadius: 'var(--radius-full)',
      padding: '6px 14px',
      cursor: 'pointer'
    }
  }, children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/containers/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
function Dialog({
  open,
  title,
  children,
  onClose
}) {
  if (!open) return null;
  return React.createElement('div', {
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(6,11,8,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100
    }
  }, React.createElement('div', {
    style: {
      background: 'var(--surface-base)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-pebble-lg)',
      boxShadow: 'var(--shadow-raised)',
      padding: '28px',
      width: 340,
      fontFamily: 'var(--font-body)',
      color: 'var(--text-primary)'
    }
  }, React.createElement('div', {
    style: {
      font: 'var(--text-heading-lg)',
      fontFamily: 'var(--font-display)',
      marginBottom: '10px'
    }
  }, title), children, React.createElement('div', {
    style: {
      textAlign: 'right',
      marginTop: '18px'
    }
  }, React.createElement('button', {
    onClick: onClose,
    style: {
      background: 'var(--accent)',
      color: 'var(--text-on-accent)',
      border: 'none',
      borderRadius: 'var(--radius-pebble-sm)',
      padding: '10px 20px',
      font: 'var(--text-body-strong)',
      cursor: 'pointer'
    }
  }, 'Close'))));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
function Toast({
  children,
  tone = 'neutral'
}) {
  const color = tone === 'success' ? 'var(--state-success)' : tone === 'error' ? 'var(--state-error)' : 'var(--terracotta)';
  return React.createElement('div', {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      background: 'var(--surface-raised)',
      border: '1px solid ' + color,
      borderRadius: 'var(--radius-pebble-sm)',
      padding: '12px 18px',
      color: 'var(--text-primary)',
      font: 'var(--text-body-sm)',
      boxShadow: 'var(--shadow-card)',
      fontFamily: 'var(--font-body)'
    }
  }, React.createElement('span', {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: color,
      flexShrink: 0
    }
  }), children);
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
function Tooltip({
  label,
  children
}) {
  const [show, setShow] = React.useState(false);
  return React.createElement('span', {
    style: {
      position: 'relative',
      display: 'inline-block'
    },
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false)
  }, children, show && React.createElement('span', {
    style: {
      position: 'absolute',
      bottom: 'calc(100% + 8px)',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--obsidian)',
      color: 'var(--alabaster)',
      border: '1px solid var(--mint)',
      borderRadius: 'var(--radius-pebble-sm)',
      padding: '6px 12px',
      font: 'var(--text-caption)',
      whiteSpace: 'nowrap',
      zIndex: 10
    }
  }, label));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function Checkbox({
  label,
  checked = false,
  onChange
}) {
  return React.createElement('label', {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      cursor: 'pointer',
      fontFamily: 'var(--font-body)',
      color: 'var(--text-primary)',
      font: 'var(--text-body-md)'
    }
  }, React.createElement('span', {
    onClick: () => onChange && onChange(!checked),
    style: {
      width: 20,
      height: 20,
      borderRadius: '6px 3px 6px 3px',
      border: '1.5px solid var(--border-default)',
      background: checked ? 'var(--accent)' : 'transparent',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-on-accent)',
      fontSize: 12,
      flexShrink: 0
    }
  }, checked ? '✓' : ''), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function Input({
  label,
  placeholder,
  value,
  onChange,
  type = 'text'
}) {
  return React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      fontFamily: 'var(--font-body)'
    }
  }, label && React.createElement('label', {
    style: {
      font: 'var(--text-caption)',
      letterSpacing: 'var(--tracking-caption)',
      color: 'var(--text-secondary)',
      textTransform: 'uppercase'
    }
  }, label), React.createElement('input', {
    type,
    placeholder,
    value,
    onChange,
    style: {
      font: 'var(--text-body-md)',
      padding: '12px 16px',
      background: 'var(--surface-raised)',
      color: 'var(--text-primary)',
      border: '1.5px solid var(--border-default)',
      borderRadius: 'var(--radius-pebble-sm)',
      outline: 'none'
    }
  }));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function Radio({
  label,
  checked = false,
  onChange
}) {
  return React.createElement('label', {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      cursor: 'pointer',
      fontFamily: 'var(--font-body)',
      color: 'var(--text-primary)',
      font: 'var(--text-body-md)'
    }
  }, React.createElement('span', {
    onClick: () => onChange && onChange(),
    style: {
      width: 20,
      height: 20,
      borderRadius: '50%',
      border: '1.5px solid ' + (checked ? 'var(--accent)' : 'var(--border-default)'),
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, checked && React.createElement('span', {
    style: {
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: 'var(--accent)'
    }
  })), label);
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function Select({
  label,
  options = [],
  value,
  onChange
}) {
  return React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      fontFamily: 'var(--font-body)'
    }
  }, label && React.createElement('label', {
    style: {
      font: 'var(--text-caption)',
      letterSpacing: 'var(--tracking-caption)',
      color: 'var(--text-secondary)',
      textTransform: 'uppercase'
    }
  }, label), React.createElement('select', {
    value,
    onChange,
    style: {
      font: 'var(--text-body-md)',
      padding: '12px 16px',
      background: 'var(--surface-raised)',
      color: 'var(--text-primary)',
      border: '1.5px solid var(--border-default)',
      borderRadius: 'var(--radius-pebble-sm)',
      outline: 'none'
    }
  }, options.map(o => React.createElement('option', {
    key: o,
    value: o
  }, o))));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function Switch({
  checked = false,
  onChange,
  label
}) {
  return React.createElement('label', {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      cursor: 'pointer',
      fontFamily: 'var(--font-body)',
      color: 'var(--text-primary)',
      font: 'var(--text-body-md)'
    }
  }, React.createElement('span', {
    onClick: () => onChange && onChange(!checked),
    style: {
      width: 40,
      height: 22,
      borderRadius: 'var(--radius-full)',
      background: checked ? 'var(--accent)' : 'var(--surface-raised)',
      border: '1px solid ' + (checked ? 'var(--accent)' : 'var(--border-default)'),
      position: 'relative',
      transition: 'background var(--duration-base)'
    }
  }, React.createElement('span', {
    style: {
      position: 'absolute',
      top: 2,
      left: checked ? 20 : 2,
      width: 16,
      height: 16,
      borderRadius: '50%',
      background: 'var(--alabaster)',
      transition: 'left var(--duration-base)'
    }
  })), label);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function Tabs({
  items = [],
  active,
  onChange
}) {
  return React.createElement('div', {
    style: {
      display: 'flex',
      gap: '24px',
      borderBottom: '1px solid var(--border-soft)',
      fontFamily: 'var(--font-body)'
    }
  }, items.map(i => React.createElement('button', {
    key: i,
    onClick: () => onChange && onChange(i),
    style: {
      background: 'none',
      border: 'none',
      padding: '10px 2px',
      cursor: 'pointer',
      font: 'var(--text-body-strong)',
      color: i === active ? 'var(--text-primary)' : 'var(--text-dim)',
      borderBottom: '2px solid ' + (i === active ? 'var(--accent)' : 'transparent')
    }
  }, i)));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/palette-app/Collections.jsx
try { (() => {
function CollectionsScreen() {
  const Cover = window.Cover;
  const cols = [{
    title: 'Sci-Fi Masterpieces',
    n: '12 items · film, book, vinyl OST',
    tone: 'mint'
  }, {
    title: 'Noir After Dark',
    n: '8 items · film, exhibit',
    tone: 'emerald'
  }, {
    title: 'Analog Warmth',
    n: '15 items · vinyl, book',
    tone: 'terracotta'
  }, {
    title: 'Gallery Season',
    n: '6 items · exhibitions',
    tone: 'mint'
  }];
  return React.createElement('div', {
    style: {
      padding: '24px 20px 90px',
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }
  }, React.createElement('div', {
    style: {
      font: 'var(--text-heading-lg)',
      fontFamily: 'var(--font-display)',
      color: 'var(--alabaster)'
    }
  }, 'Curated Collections'), React.createElement('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 14
    }
  }, cols.map(c => React.createElement('div', {
    key: c.title,
    style: {
      background: 'var(--surface-base)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-pebble-md)',
      padding: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, React.createElement(Cover, {
    label: 'COLLECTION',
    tone: c.tone,
    h: 80
  }), React.createElement('div', {
    style: {
      font: 'var(--text-body-strong)',
      color: 'var(--alabaster)'
    }
  }, c.title), React.createElement('div', {
    style: {
      font: 'var(--text-caption)',
      color: 'var(--slate)'
    }
  }, c.n)))));
}
window.CollectionsScreen = CollectionsScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/palette-app/Collections.jsx", error: String((e && e.message) || e) }); }

// ui_kits/palette-app/Home.jsx
try { (() => {
function Cover({
  label,
  tone = 'emerald',
  h = 120
}) {
  const bg = tone === 'terracotta' ? 'var(--terracotta)' : tone === 'mint' ? 'var(--mint)' : 'var(--emerald-deep)';
  return React.createElement('div', {
    style: {
      height: h,
      background: bg,
      borderRadius: 'var(--radius-pebble-sm)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: tone === 'terracotta' ? 'var(--obsidian)' : 'var(--slate)',
      font: 'var(--text-mono-sm)',
      letterSpacing: 'var(--tracking-mono)',
      border: '1px solid var(--border-soft)'
    }
  }, label);
}
function HomeScreen() {
  return React.createElement('div', {
    style: {
      padding: '24px 20px 90px',
      display: 'flex',
      flexDirection: 'column',
      gap: 22
    }
  }, React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, React.createElement('div', {
    style: {
      font: 'var(--text-heading-lg)',
      fontFamily: 'var(--font-display)',
      color: 'var(--alabaster)'
    }
  }, 'Palette'), React.createElement('img', {
    src: '../../assets/logo-mark.jpg',
    style: {
      width: 36,
      height: 36,
      borderRadius: '10px 6px 10px 6px',
      animation: 'breathe var(--duration-breath) var(--ease-breath) infinite'
    }
  })), React.createElement('div', {
    style: {
      background: 'var(--emerald)',
      border: '1.5px solid var(--mint)',
      borderRadius: 'var(--radius-pebble-lg)',
      padding: 20,
      boxShadow: 'var(--shadow-glow-terracotta)'
    }
  }, React.createElement('div', {
    style: {
      font: 'var(--text-caption)',
      letterSpacing: 'var(--tracking-caption)',
      color: 'var(--terracotta)',
      textTransform: 'uppercase',
      marginBottom: 10
    }
  }, "Today's Cultural Anchor"), React.createElement(Cover, {
    label: 'VINYL · SIDE A',
    tone: 'terracotta',
    h: 100
  }), React.createElement('div', {
    style: {
      marginTop: 14,
      font: 'var(--text-heading-md)',
      fontFamily: 'var(--font-display)',
      color: 'var(--alabaster)'
    }
  }, 'Kind of Blue'), React.createElement('div', {
    style: {
      font: 'var(--text-body-sm)',
      color: 'var(--slate)'
    }
  }, 'Miles Davis · 1959'), React.createElement('div', {
    style: {
      display: 'flex',
      gap: 10,
      marginTop: 16
    }
  }, React.createElement('button', {
    style: {
      flex: 1,
      background: 'var(--accent)',
      border: 'none',
      borderRadius: 'var(--radius-pebble-sm)',
      padding: '10px 0',
      color: 'var(--obsidian)',
      font: 'var(--text-body-strong)',
      cursor: 'pointer'
    }
  }, 'Export Card'), React.createElement('button', {
    style: {
      flex: 1,
      background: 'transparent',
      border: '1.5px solid var(--mint)',
      borderRadius: 'var(--radius-pebble-sm)',
      padding: '10px 0',
      color: 'var(--alabaster)',
      font: 'var(--text-body-strong)',
      cursor: 'pointer'
    }
  }, 'Listen on Spotify'))), React.createElement('div', {}, React.createElement('div', {
    style: {
      font: 'var(--text-caption)',
      letterSpacing: 'var(--tracking-caption)',
      color: 'var(--slate)',
      textTransform: 'uppercase',
      marginBottom: 10
    }
  }, 'Recently Logged'), React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, [['BOOK', 'Dune', 'Frank Herbert', 'emerald'], ['FILM', 'Paris, Texas', 'Wim Wenders, 1984', 'mint']].map(([b, t, s, tone]) => React.createElement('div', {
    key: t,
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'center',
      background: 'var(--surface-raised)',
      borderRadius: 'var(--radius-pebble-sm)',
      padding: 10
    }
  }, React.createElement(Cover, {
    label: b,
    tone,
    h: 56
  }), React.createElement('div', {}, React.createElement('div', {
    style: {
      font: 'var(--text-body-strong)',
      color: 'var(--alabaster)'
    }
  }, t), React.createElement('div', {
    style: {
      font: 'var(--text-body-sm)',
      color: 'var(--slate)'
    }
  }, s)))))));
}
window.HomeScreen = HomeScreen;
window.Cover = Cover;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/palette-app/Home.jsx", error: String((e && e.message) || e) }); }

// ui_kits/palette-app/Shell.jsx
try { (() => {
function Shell({
  active,
  onNav,
  children
}) {
  const items = [{
    id: 'home',
    icon: '◐',
    label: 'Today'
  }, {
    id: 'stream',
    icon: '≋',
    label: 'Stream'
  }, {
    id: 'vault',
    icon: '▤',
    label: 'Vault'
  }, {
    id: 'collections',
    icon: '◈',
    label: 'Collections'
  }];
  return React.createElement('div', {
    style: {
      width: 390,
      height: 812,
      background: 'var(--obsidian)',
      borderRadius: '36px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-body)',
      boxShadow: 'var(--shadow-raised)',
      position: 'relative'
    }
  }, React.createElement('div', {
    style: {
      flex: 1,
      overflowY: 'auto'
    }
  }, children), React.createElement('div', {
    style: {
      display: 'flex',
      justifyContent: 'space-around',
      padding: '14px 0 22px',
      background: 'var(--emerald-deep)',
      borderTop: '1px solid var(--border-soft)'
    }
  }, items.map(i => React.createElement('button', {
    key: i.id,
    onClick: () => onNav(i.id),
    style: {
      background: 'none',
      border: 'none',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      color: active === i.id ? 'var(--terracotta)' : 'var(--slate)',
      cursor: 'pointer'
    }
  }, React.createElement('span', {
    style: {
      fontSize: 20
    }
  }, i.icon), React.createElement('span', {
    style: {
      font: 'var(--text-mono-sm)',
      letterSpacing: 'var(--tracking-mono)'
    }
  }, i.label)))));
}
window.Shell = Shell;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/palette-app/Shell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/palette-app/Stream.jsx
try { (() => {
function StreamScreen() {
  const Cover = window.Cover;
  const posts = [{
    who: '@marlowe',
    what: 'logged a gig photo dump',
    cover: ['EXHIBIT', 'terracotta'],
    title: 'Hopper: Sunlight',
    sub: 'Whitney Museum · gallery dump',
    cta: 'View 6 Photos'
  }, {
    who: '@nadia',
    what: 'rated a film',
    cover: ['FILM', 'mint'],
    title: 'In the Mood for Love',
    sub: 'Wong Kar-wai · 2000',
    cta: 'Watch on Apple TV'
  }, {
    who: 'Curator Pick',
    what: 'Sci-Fi Masterpieces',
    cover: ['BOOK', 'emerald'],
    title: 'The Left Hand of Darkness',
    sub: 'Ursula K. Le Guin · 1969',
    cta: 'Buy on Bookshop.org'
  }];
  return React.createElement('div', {
    style: {
      padding: '24px 20px 90px',
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, React.createElement('div', {
    style: {
      font: 'var(--text-heading-lg)',
      fontFamily: 'var(--font-display)',
      color: 'var(--alabaster)'
    }
  }, 'Stream'), posts.map(p => React.createElement('div', {
    key: p.title,
    style: {
      background: 'var(--surface-base)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-pebble-md)',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, React.createElement('div', {
    style: {
      font: 'var(--text-mono-sm)',
      letterSpacing: 'var(--tracking-mono)',
      color: 'var(--slate)'
    }
  }, p.who + ' ' + p.what), React.createElement(Cover, {
    label: p.cover[0],
    tone: p.cover[1],
    h: 140
  }), React.createElement('div', {
    style: {
      font: 'var(--text-heading-md)',
      fontFamily: 'var(--font-display)',
      color: 'var(--alabaster)'
    }
  }, p.title), React.createElement('div', {
    style: {
      font: 'var(--text-body-sm)',
      color: 'var(--slate)'
    }
  }, p.sub), React.createElement('button', {
    style: {
      alignSelf: 'flex-start',
      background: 'transparent',
      border: '1.5px solid var(--terracotta)',
      color: 'var(--terracotta)',
      borderRadius: 'var(--radius-full)',
      padding: '8px 16px',
      font: 'var(--text-body-sm)',
      fontWeight: 600,
      cursor: 'pointer'
    }
  }, p.cta))));
}
window.StreamScreen = StreamScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/palette-app/Stream.jsx", error: String((e && e.message) || e) }); }

// ui_kits/palette-app/Vault.jsx
try { (() => {
function VaultScreen() {
  const Cover = window.Cover;
  const [items, setItems] = React.useState([{
    title: 'Blade Runner 2049',
    sub: 'Denis Villeneuve · 2017',
    tone: 'mint',
    b: 'FILM',
    done: false
  }, {
    title: 'Solaris',
    sub: 'Stanislaw Lem',
    tone: 'emerald',
    b: 'BOOK',
    done: false
  }, {
    title: 'Discovery',
    sub: 'Daft Punk · 2001',
    tone: 'terracotta',
    b: 'VINYL',
    done: true
  }]);
  function toggle(i) {
    setItems(items.map((it, idx) => idx === i ? {
      ...it,
      done: !it.done
    } : it));
  }
  return React.createElement('div', {
    style: {
      padding: '24px 20px 90px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, React.createElement('div', {
    style: {
      font: 'var(--text-heading-lg)',
      fontFamily: 'var(--font-display)',
      color: 'var(--alabaster)'
    }
  }, 'My List'), React.createElement('div', {
    style: {
      font: 'var(--text-body-sm)',
      color: 'var(--slate)'
    }
  }, 'Your smart queue — tap to migrate to Consumed.'), items.map((it, i) => React.createElement('div', {
    key: it.title,
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'center',
      background: 'var(--surface-raised)',
      borderRadius: 'var(--radius-pebble-sm)',
      padding: 10,
      opacity: it.done ? 0.55 : 1
    }
  }, React.createElement(Cover, {
    label: it.b,
    tone: it.tone,
    h: 52
  }), React.createElement('div', {
    style: {
      flex: 1
    }
  }, React.createElement('div', {
    style: {
      font: 'var(--text-body-strong)',
      color: 'var(--alabaster)',
      textDecoration: it.done ? 'line-through' : 'none'
    }
  }, it.title), React.createElement('div', {
    style: {
      font: 'var(--text-body-sm)',
      color: 'var(--slate)'
    }
  }, it.sub)), React.createElement('span', {
    onClick: () => toggle(i),
    style: {
      width: 22,
      height: 22,
      borderRadius: '6px 3px 6px 3px',
      border: '1.5px solid var(--border-default)',
      background: it.done ? 'var(--accent)' : 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--obsidian)',
      fontSize: 13,
      cursor: 'pointer',
      flexShrink: 0
    }
  }, it.done ? '✓' : ''))));
}
window.VaultScreen = VaultScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/palette-app/Vault.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
