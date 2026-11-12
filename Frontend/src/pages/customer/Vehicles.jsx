import { tr, trTemplate } from "../../i18n/translations";
import { LoadingState } from '../../components/ui/LoadingState';
import { useEffect, useRef, useState } from 'react';
import { Check, CheckCircle2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthField, AuthNotice, AuthSubmit } from '../../components/auth/AuthControls';
import { CustomerHeading } from '../../components/customer/CustomerHeading';
import { VehicleIcon } from '../../components/customer/VehicleIcon';
import { useApp } from '../../context/useApp';
import { useCustomer } from '../../context/useCustomer';
import { validateVehicle } from '../../utils/vehicleValidation';
const emptyVehicle = {
  type: '',
  make: '',
  model: '',
  year: '',
  color: '',
  plate: ''
};
export function Vehicles() {
  const {
    vehicles,
    selectedVehicle,
    saveVehicle,
    selectVehicle,
    removeVehicle,
    vehicleStatus,
    vehicleError,
    refreshData,
    localGarage
  } = useCustomer();
  const {
    updateRequest
  } = useApp();
  const [fields, setFields] = useState(emptyVehicle);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState(null);
  const [removalError, setRemovalError] = useState('');
  const removalDialog = useRef(null);
  const formRef = useRef(null);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const service = ['mechanic', 'towing'].includes(params.get('continue')) ? params.get('continue') : null;
  function update(event) {
    setFields(current => ({
      ...current,
      [event.target.name]: event.target.value
    }));
    setErrors(current => ({
      ...current,
      [event.target.name]: ''
    }));
    setMessage('');
  }
  function continueWith(vehicle) {
    if (!service) return;
    updateRequest({
      vehicleId: vehicle.id,
      serviceType: service
    });
    navigate(service === 'towing' ? '/request/towing' : '/request?service=mechanic');
  }
  function choose(vehicle) {
    try {
      selectVehicle(vehicle.id);
      setMessage('Vehicle selected.');
      setError('');
    } catch (failure) {
      setError(failure.message);
    }
  }
  function edit(vehicle) {
    setFields({
      type: vehicle.type,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year == null ? '' : String(vehicle.year),
      color: vehicle.color || '',
      plate: vehicle.plate || ''
    });
    setEditingId(vehicle.id);
    setErrors({});
    setMessage('');
    setError('');
    formRef.current.elements.type.focus();
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const validation = validateVehicle(fields, vehicles, editingId);
    setErrors(validation);
    setError('');
    setMessage('');
    if (Object.keys(validation).length) {
      requestAnimationFrame(() => formRef.current.elements.namedItem(Object.keys(validation)[0])?.focus());
      return;
    }
    setBusy(true);
    try {
      const vehicle = await saveVehicle(fields, editingId);
      setFields(emptyVehicle);
      setEditingId(null);
      setMessage(localGarage ? 'Vehicle saved on this device and selected.' : 'Vehicle saved and selected.');
      continueWith(vehicle);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!pendingRemoval || busy) return;
    setBusy(true);
    try {
      await removeVehicle(pendingRemoval.id);
      if (editingId === pendingRemoval.id) {
        setEditingId(null);
        setFields(emptyVehicle);
      }
      setMessage('Vehicle removed.');
      removalDialog.current.close();
      setPendingRemoval(null);
    } catch (failure) {
      setRemovalError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return <>
      <CustomerHeading title={tr("My vehicles")} backTo={service ? '/app' : '/account'}>{tr("Choose the vehicle that needs a buddy.")}</CustomerHeading>
      {vehicleStatus === 'loading' && <LoadingState label={tr("Loading your vehicles...")} />}
      {vehicleStatus === 'error' && <AuthNotice error>
          {vehicleError}{' '}
          <button type="button" onClick={refreshData} className="customer-text-button">{tr("Retry")}</button>
        </AuthNotice>}
      <div className="customer-vehicle-list" role="radiogroup" aria-label={tr("Select a vehicle")}>
        {vehicles.map((vehicle, index) => {
        const selected = selectedVehicle?.id === vehicle.id;
        return <div key={vehicle.id} className={`customer-vehicle-item ${selected ? 'is-selected' : ''}`}>
              <button type="button" className="customer-vehicle-choice" role="radio" aria-checked={selected} tabIndex={selected || !selectedVehicle && index === 0 ? 0 : -1} onKeyDown={event => {
            const delta = {
              ArrowRight: 1,
              ArrowDown: 1,
              ArrowLeft: -1,
              ArrowUp: -1
            }[event.key];
            if (!delta) return;
            event.preventDefault();
            const nextIndex = (index + delta + vehicles.length) % vehicles.length;
            choose(vehicles[nextIndex]);
            const choices = event.currentTarget.closest('[role="radiogroup"]').querySelectorAll('[role="radio"]');
            choices[nextIndex].focus();
          }} disabled={busy} onClick={() => choose(vehicle)}>
                <span>
                  {selected ? <CheckCircle2 size={21} /> : <VehicleIcon type={vehicle.type} />}
                  <strong>
                    {[`${vehicle.make} ${vehicle.model}`, vehicle.year].filter(Boolean).join(' · ')}
                  </strong>
                  <b>{selected ? tr("Selected") : tr("Select")}</b>
                </span>
                <small>
                  {[vehicle.color, vehicle.plate].filter(Boolean).join(' · ') || tr('Extra details can be added later.')}
                </small>
              </button>
              <div className="customer-vehicle-tools">
                <button type="button" className="customer-vehicle-edit" aria-label={trTemplate(["Edit ", " ", ""], [vehicle.make, vehicle.model])} title={tr("Edit vehicle")} onClick={() => edit(vehicle)} disabled={busy}>
                  <Pencil size={17} />
                </button>
                <button type="button" className="customer-vehicle-edit" title={tr("Remove vehicle")} aria-label={trTemplate(["Remove ", " ", ""], [vehicle.make, vehicle.model])} disabled={busy} onClick={() => {
              setPendingRemoval(vehicle);
              setRemovalError('');
              removalDialog.current.showModal();
            }}>
                  <Trash2 size={17} />
                </button>
              </div>
            </div>;
      })}
      </div>
      {vehicleStatus === 'ready' && !vehicles.length && <p className="customer-muted">{tr("Add your first vehicle to request roadside assistance.")}</p>}
      {service && selectedVehicle && <button type="button" className="auth-primary customer-continue" onClick={() => continueWith(selectedVehicle)} disabled={busy}>
          <Check size={19} />{tr("Continue with selected vehicle")}</button>}
      <div role="status" className="customer-save-status">
        {tr(message)}
      </div>
      <form ref={formRef} onSubmit={submit} className="auth-form customer-vehicle-form" noValidate>
        <div className="customer-section-heading">
          <h2>
            {editingId ? tr("Edit vehicle") : vehicles.length ? tr("Add another vehicle") : tr("Add your first vehicle")}
          </h2>
          {editingId && <button type="button" onClick={() => {
          setEditingId(null);
          setFields(emptyVehicle);
          setErrors({});
        }}>{tr("Cancel")}</button>}
        </div>
        <fieldset disabled={busy || vehicleStatus !== 'ready'} className="customer-fieldset">
          <VehicleFields fields={fields} errors={errors} onChange={update} />
          <p className="auth-hint">{tr("Your selected vehicle is included in every request.")} {localGarage ? tr(" Vehicle details are saved on this device.") : ''}
          </p>
          {error && <AuthNotice error>{tr(error)}</AuthNotice>}
          <AuthSubmit busy={busy} icon={editingId ? Check : Plus}>
            {editingId ? tr("Save vehicle changes") : tr("Save new vehicle")}
          </AuthSubmit>
        </fieldset>
      </form>
      <dialog ref={removalDialog} className="auth-policy" aria-labelledby="remove-vehicle-title" onCancel={event => {
      if (busy) event.preventDefault();
    }}>
        <h2 id="remove-vehicle-title">{tr("Remove vehicle?")}</h2>
        <p>{tr("Remove")} {pendingRemoval?.make} {pendingRemoval?.model} {tr("from your saved vehicles? Past bookings will remain in your history.")}</p>
        {removalError && <AuthNotice error>{removalError}</AuthNotice>}
        <div className="customer-remove-actions">
          <button type="button" className="auth-secondary" onClick={() => removalDialog.current.close()} disabled={busy}>{tr("Keep vehicle")}</button>
          <button type="button" className="auth-primary" onClick={remove} disabled={busy}>
            {busy ? tr("Removing...") : tr("Remove vehicle")}
          </button>
        </div>
      </dialog>
    </>;
}

// The same short vehicle form is used during setup and in My vehicles.
export function VehicleFields({ fields, errors, onChange }) {
  const showDetails = Boolean(errors.year || errors.color || errors.plate);
  const [detailsOpen, setDetailsOpen] = useState(false);
  useEffect(() => { if (showDetails) setDetailsOpen(true); }, [showDetails]);
  return <>
    <div className="auth-field">
      <label htmlFor="vehicle-type">{tr('Vehicle type')}</label>
      <select id="vehicle-type" name="type" value={fields.type} onChange={onChange} required aria-invalid={Boolean(errors.type)} aria-describedby={errors.type ? 'type-error' : undefined}>
        <option value="">{tr('Choose a type')}</option>
        <option value="motorcycle">{tr('Motorcycle')}</option>
        <option value="car">{tr('Car')}</option>
      </select>
      {errors.type && <p className="auth-field-error" id="type-error">{tr(errors.type)}</p>}
    </div>
    <div className="customer-form-row">
      <AuthField id="vehicle-make" name="make" label={tr('Brand')} value={fields.make} onChange={onChange} error={errors.make} maxLength={60} required />
      <AuthField id="vehicle-model" name="model" label={tr('Model')} value={fields.model} onChange={onChange} error={errors.model} maxLength={80} required />
    </div>
    <details className="auth-field" open={detailsOpen} onToggle={event => setDetailsOpen(event.currentTarget.open)}>
      <summary>{tr('Extra vehicle details (optional)')}</summary>
      <AuthField id="vehicle-year" name="year" label={tr('Year (optional)')} type="number" inputMode="numeric" min="1900" max={new Date().getFullYear() + 1} value={fields.year} onChange={onChange} error={errors.year} />
      <AuthField id="vehicle-color" name="color" label={tr('Color (optional)')} value={fields.color} onChange={onChange} error={errors.color} maxLength={40} />
      <AuthField id="vehicle-plate" name="plate" label={tr('Plate number (optional)')} value={fields.plate} onChange={onChange} error={errors.plate} maxLength={15} />
    </details>
  </>;
}
