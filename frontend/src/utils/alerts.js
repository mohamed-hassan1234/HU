import Swal from 'sweetalert2';

export const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2600,
  timerProgressBar: true
});

export const confirmDelete = () =>
  Swal.fire({
    title: 'Delete record?',
    text: 'This action cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#b91c1c',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Delete'
  });
