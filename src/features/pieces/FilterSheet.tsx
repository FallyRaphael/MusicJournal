import type { FeelFilter, PieceSort } from '../../domain/pieces';
import { Button } from '../../ui/Button';
import { ChipRow, ToggleChip } from '../../ui/Chip';
import { ChoiceList } from '../../ui/ChoiceList';
import { FieldGroup } from '../../ui/Field';
import { Sheet } from '../../ui/Sheet';
import { FEEL_FILTER_LABELS, SORT_LABELS } from './labels';

const SORTS = Object.keys(SORT_LABELS) as PieceSort[];
const FEELS = Object.keys(FEEL_FILTER_LABELS) as FeelFilter[];

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  sort: PieceSort;
  feels: readonly FeelFilter[];
  tags: readonly string[];
  allTags: readonly string[];
  onSortChange: (sort: PieceSort) => void;
  onFeelsChange: (feels: FeelFilter[]) => void;
  onTagsChange: (tags: string[]) => void;
  onReset: () => void;
}

const toggle = <T,>(list: readonly T[], value: T, on: boolean): T[] =>
  on ? [...list, value] : list.filter((v) => v !== value);

/** Sort order and filters for the pieces list. Changes apply immediately. */
export function FilterSheet(props: FilterSheetProps) {
  const { open, onClose, sort, feels, tags, allTags } = props;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Sort & filter"
      footer={
        <>
          <Button onClick={props.onReset}>Reset</Button>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <FieldGroup label="Sort by">
        <ChoiceList
          legend="Sort by"
          name="piece-sort"
          choices={SORTS.map((value) => ({ value, label: SORT_LABELS[value] }))}
          value={sort}
          onChange={props.onSortChange}
        />
      </FieldGroup>
      <FieldGroup label="Feels">
        <ChipRow>
          {FEELS.map((feel) => (
            <ToggleChip
              key={feel}
              pressed={feels.includes(feel)}
              onChange={(on) => props.onFeelsChange(toggle(feels, feel, on))}
            >
              {FEEL_FILTER_LABELS[feel]}
            </ToggleChip>
          ))}
        </ChipRow>
      </FieldGroup>
      <FieldGroup
        label="Tags"
        hint={
          allTags.length === 0
            ? 'Tags you add to pieces show up here.'
            : 'Shows pieces with any of the selected tags.'
        }
      >
        {allTags.length > 0 && (
          <ChipRow>
            {allTags.map((tag) => (
              <ToggleChip
                key={tag}
                pressed={tags.includes(tag)}
                onChange={(on) => props.onTagsChange(toggle(tags, tag, on))}
              >
                {tag}
              </ToggleChip>
            ))}
          </ChipRow>
        )}
      </FieldGroup>
    </Sheet>
  );
}
