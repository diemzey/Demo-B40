import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, PlusIcon } from 'lucide-react';

type ContactInfoProps = React.ComponentProps<'div'> & {
	icon: LucideIcon;
	label: string;
	value: string;
};

type ContactCardProps = Omit<React.ComponentProps<'div'>, 'title'> & {
	// Content props
	title?: React.ReactNode;
	description?: React.ReactNode;
	contactInfo?: ContactInfoProps[];
	formSectionClassName?: string;
};

export function ContactCard({
	title = 'Contact With Us',
	description = 'If you have any questions regarding our Services or need help, please fill out the form here. We do our best to respond within 1 business day.',
	contactInfo,
	className,
	formSectionClassName,
	children,
	...props
}: ContactCardProps) {
	return (
		<div
			className={cn(
				'bg-card border relative grid h-full w-full shadow md:grid-cols-2 lg:grid-cols-3',
				className,
			)}
			{...props}
		>
			<PlusIcon className="absolute -top-3 -left-3 h-6 w-6" />
			<PlusIcon className="absolute -top-3 -right-3 h-6 w-6" />
			<PlusIcon className="absolute -bottom-3 -left-3 h-6 w-6" />
			<PlusIcon className="absolute -right-3 -bottom-3 h-6 w-6" />
			<div className="flex flex-col justify-between lg:col-span-2">
				<div className="relative h-full space-y-4 px-4 py-8 md:p-8">
					<h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
						{title}
					</h2>
					<p className="text-muted-foreground max-w-xl leading-relaxed">
						{description}
					</p>
					<div className="grid gap-4 md:grid md:grid-cols-2 lg:grid-cols-3">
						{contactInfo?.map((info) => (
							// Clave estable por contenido, no por posición.
							<ContactInfo key={`${info.label}-${info.value}`} {...info} />
						))}
					</div>
				</div>
			</div>
			<div
				className={cn(
					'bg-muted/40 flex h-full w-full items-center border-t p-5 md:col-span-1 md:border-t-0 md:border-l',
					formSectionClassName,
				)}
			>
				{children}
			</div>
		</div>
	);
}

function ContactInfo({
	icon: Icon,
	label,
	value,
	className,
	...props
}: ContactInfoProps) {
	return (
		<div className={cn('flex items-center gap-3 py-2', className)} {...props}>
			<Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
			<div>
				<p className="font-medium">{label}</p>
				<p className="text-muted-foreground text-xs">{value}</p>
			</div>
		</div>
	);
}
