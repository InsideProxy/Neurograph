// Lista desplegable del contexto de datos (D4 de docs/decisiones-diseno.md;
// docs/rediseno-interfaz-diseno.md, 5.1). Sustituye a los <select> nativos
// de la barra, que cortaban el texto: el botón muestra un nombre corto y la
// lista, las etiquetas completas. Solo presenta: qué atlas o qué
// clasificación está elegida, y qué pasa al elegir otra, sigue en App.
//
// Teclado (lógica en logic/listbox.ts): flecha abajo o arriba sobre el
// botón abre la lista. En ella, las flechas, Inicio y Fin mueven la opción
// activa, Intro o espacio la eligen, Escape cierra y Tab cierra y sigue.
// Al elegir o al cerrar con el teclado, el foco vuelve al botón. Para que
// vuelva también al cambiar de atlas, App no desmonta la barra (el
// Fragment con clave de renderHeader).
import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { initialActiveIndex, listboxKey } from "../logic/listbox";
import { Icon } from "./Icon";

export interface DataContextOption {
  value: string;
  label: string;
}

interface DataContextMenuProps {
  // Rótulo pequeño del botón y nombre de la lista: «Atlas», «Redes».
  caption: string;
  // Nombre corto de lo elegido, el que muestra el botón.
  valueLabel: string;
  // Etiqueta emergente del botón: el nombre completo.
  title?: string;
  options: DataContextOption[];
  value: string;
  onChange: (value: string) => void;
  // La opción elegida todavía se está cargando (networkSourcePending de App):
  // el chevron pasa a ser un indicador que gira, del mismo tamaño, así que
  // el botón no cambia de ancho. «cargando…» queda para los lectores de
  // pantalla.
  pending?: boolean;
}

export function DataContextMenu({
  caption,
  valueLabel,
  title,
  options,
  value,
  onChange,
  pending = false,
}: DataContextMenuProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const baseId = useId();
  const captionId = `${baseId}-caption`;
  const listId = `${baseId}-list`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const openList = () => {
    setActive(initialActiveIndex(options.findIndex((option) => option.value === value), options.length));
    setOpen(true);
  };

  const closeList = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const choose = (index: number) => {
    const option = options[index];
    closeList();
    if (option && option.value !== value) onChange(option.value);
  };

  // Al abrir, el foco pasa a la lista: aria-activedescendant señala la
  // opción activa.
  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  // La opción activa, siempre a la vista.
  useEffect(() => {
    if (open) document.getElementById(`${baseId}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, baseId]);

  // Un clic fuera la cierra sin mover el foco: se queda donde se hizo clic.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!listRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      openList();
    }
  };

  const handleListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const result = listboxKey(event.key, active, options.length);
    if (result.kind === "ignore") return;
    if (result.kind !== "close" || !result.keepDefault) event.preventDefault();
    if (result.kind === "move") setActive(result.index);
    else if (result.kind === "choose") choose(result.index);
    else closeList();
  };

  // Si el foco sale del bloque (un clic que enfoca otro control), la lista
  // se cierra.
  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (!open || !next || event.currentTarget.contains(next)) return;
    setOpen(false);
  };

  return (
    <div className="data-menu" onBlur={handleBlur}>
      <button
        ref={triggerRef}
        type="button"
        className="data-menu__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        title={title}
        onClick={() => (open ? closeList() : openList())}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="data-menu__text">
          <span className="data-menu__caption" id={captionId}>
            {caption}
          </span>
          <span className="data-menu__value">
            {valueLabel}
            {pending && <span className="visually-hidden">, cargando…</span>}
          </span>
        </span>
        <Icon name={pending ? "spinner" : "chevronDown"} size={14} className={pending ? "data-menu__spinner" : undefined} />
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          className="data-menu__list"
          role="listbox"
          tabIndex={-1}
          aria-labelledby={captionId}
          aria-activedescendant={options.length > 0 ? optionId(active) : undefined}
          onKeyDown={handleListKeyDown}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={optionId(index)}
              role="option"
              aria-selected={option.value === value}
              className={index === active ? "data-menu__option data-menu__option--active" : "data-menu__option"}
              onClick={() => choose(index)}
              onMouseMove={() => setActive(index)}
            >
              <span className="data-menu__check">{option.value === value && <Icon name="check" size={14} />}</span>
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
